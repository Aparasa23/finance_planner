import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode
} from 'plaid'
import { FinancialProvider } from './provider'
import {
  ProviderAccount,
  ProviderCreditCardDetails,
  ProviderLoanDetails,
  SyncTransactionsResult,
  ProviderTransaction
} from './types'

export class PlaidProvider implements FinancialProvider {
  private plaidClient: PlaidApi

  constructor() {
    const plaidEnv = process.env.PLAID_ENV || 'sandbox'
    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidEnv],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    })
    this.plaidClient = new PlaidApi(configuration)
  }

  async createLinkToken(userId: string, householdId: string): Promise<string> {
    const products = (process.env.PLAID_PRODUCTS?.split(',') || ['auth', 'transactions', 'liabilities']) as Products[]
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith('http')
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/plaid`
      : undefined

    try {
      const response = await this.plaidClient.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: 'Finance OS',
        products,
        country_codes: (process.env.PLAID_COUNTRY_CODES?.split(',') || ['US']) as CountryCode[],
        language: 'en',
        ...(webhookUrl ? { webhook: webhookUrl } : {}),
      })
      return response.data.link_token
    } catch (error: any) {
      console.error('Failed to create link token with products:', products, error.response?.data || error.message)
      
      // Fallback: If liabilities failed (e.g., product access not approved on your Plaid team), retry with auth & transactions
      if (products.includes(Products.Liabilities)) {
        console.log('Retrying Link token creation without liabilities product...')
        const fallbackProducts = products.filter((p) => p !== Products.Liabilities)
        
        try {
          const response = await this.plaidClient.linkTokenCreate({
            user: {
              client_user_id: userId,
            },
            client_name: 'Finance OS',
            products: fallbackProducts,
            country_codes: (process.env.PLAID_COUNTRY_CODES?.split(',') || ['US']) as CountryCode[],
            language: 'en',
            ...(webhookUrl ? { webhook: webhookUrl } : {}),
          })
          return response.data.link_token
        } catch (fallbackError: any) {
          console.error('Fallback Link token creation also failed:', fallbackError.response?.data || fallbackError.message)
          throw fallbackError;
        }
      }
      throw error
    }
  }

  async exchangePublicToken(publicToken: string): Promise<{
    accessToken: string
    itemId: string
    institutionName: string
  }> {
    const exchangeResponse = await this.plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    })

    const accessToken = exchangeResponse.data.access_token
    const itemId = exchangeResponse.data.item_id

    // Fetch institution name using item metadata
    const itemResponse = await this.plaidClient.itemGet({
      access_token: accessToken,
    })

    let institutionName = 'Connected Institution'
    if (itemResponse.data.item.institution_id) {
      try {
        const instResponse = await this.plaidClient.institutionsGetById({
          institution_id: itemResponse.data.item.institution_id,
          country_codes: [CountryCode.Us],
        })
        institutionName = instResponse.data.institution.name
      } catch (err) {
        console.error('Could not fetch Plaid institution name:', err)
      }
    }

    return {
      accessToken,
      itemId,
      institutionName,
    }
  }

  async syncAccounts(accessToken: string): Promise<ProviderAccount[]> {
    const response = await this.plaidClient.accountsGet({
      access_token: accessToken,
    })

    return response.data.accounts.map((acc) => ({
      id: acc.account_id,
      name: acc.name,
      type: acc.type,
      subtype: acc.subtype || null,
      mask: acc.mask || null,
      currentBalance: acc.balances.current || 0,
      availableBalance: acc.balances.available || null,
      creditLimit: acc.balances.limit || null,
    }))
  }

  async syncTransactions(accessToken: string, cursor?: string): Promise<SyncTransactionsResult> {
    let added: ProviderTransaction[] = []
    let modified: ProviderTransaction[] = []
    let removed: string[] = []
    let currentCursor: string = cursor || ''
    let hasMore = true

    // Plaid transactionsSync is paginated. Loop until has_more is false
    while (hasMore) {
      const response = await this.plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: currentCursor,
        count: 500,
      })

      const data = response.data

      added = added.concat(
        data.added.map((tx) => ({
          id: tx.transaction_id,
          accountId: tx.account_id,
          amount: tx.amount,
          date: tx.date,
          description: tx.name,
          merchantName: tx.merchant_name || tx.name,
          category: tx.personal_finance_category?.primary || tx.category?.[0] || 'Uncategorized',
          subcategory: tx.personal_finance_category?.detailed || tx.category?.[1] || null,
          pending: tx.pending,
        }))
      )

      modified = modified.concat(
        data.modified.map((tx) => ({
          id: tx.transaction_id,
          accountId: tx.account_id,
          amount: tx.amount,
          date: tx.date,
          description: tx.name,
          merchantName: tx.merchant_name || tx.name,
          category: tx.personal_finance_category?.primary || tx.category?.[0] || 'Uncategorized',
          subcategory: tx.personal_finance_category?.detailed || tx.category?.[1] || null,
          pending: tx.pending,
        }))
      )

      removed = removed.concat(data.removed.map((tx) => tx.transaction_id))
      currentCursor = data.next_cursor || ''
      hasMore = data.has_more
    }

    return {
      added,
      modified,
      removed,
      nextCursor: currentCursor,
    }
  }

  async syncLiabilities(accessToken: string): Promise<{
    creditCards: ProviderCreditCardDetails[]
    loans: ProviderLoanDetails[]
  }> {
    const response = await this.plaidClient.liabilitiesGet({
      access_token: accessToken,
    })

    const creditCards: ProviderCreditCardDetails[] = []
    const loans: ProviderLoanDetails[] = []

    const liabilities = response.data.liabilities

    if (liabilities.credit) {
      liabilities.credit.forEach((card: any) => {
        if (card.account_id) {
          creditCards.push({
            accountId: card.account_id,
            statementBalance: card.last_statement_balance || 0,
            minimumPayment: card.minimum_payment_amount || 0,
            dueDate: card.next_payment_due_date || null,
            statementClosingDate: card.last_statement_issue_date || null,
          })
        }
      })
    }

    if (liabilities.mortgage) {
      liabilities.mortgage.forEach((m: any) => {
        if (m.account_id) {
          loans.push({
            accountId: m.account_id,
            outstandingBalance: m.outstanding_principal_balance || 0,
            nextPaymentDate: m.next_payment_due_date || null,
            nextPaymentAmount: m.next_monthly_payment || null,
          })
        }
      })
    }

    if (liabilities.student) {
      liabilities.student.forEach((s: any) => {
        if (s.account_id) {
          loans.push({
            accountId: s.account_id,
            outstandingBalance: s.outstanding_interest_amount || 0,
            nextPaymentDate: s.next_payment_due_date || null,
            nextPaymentAmount: s.minimum_payment_amount || null,
          })
        }
      })
    }

    return {
      creditCards,
      loans,
    }
  }

  async disconnectItem(accessToken: string): Promise<void> {
    await this.plaidClient.itemRemove({
      access_token: accessToken,
    })
  }
}
