import {
  ProviderAccount,
  ProviderCreditCardDetails,
  ProviderLoanDetails,
  SyncTransactionsResult
} from './types'

export interface FinancialProvider {
  createLinkToken(userId: string, householdId: string): Promise<string>
  exchangePublicToken(publicToken: string): Promise<{
    accessToken: string
    itemId: string
    institutionName: string
  }>
  syncAccounts(accessToken: string): Promise<ProviderAccount[]>
  syncTransactions(accessToken: string, cursor?: string): Promise<SyncTransactionsResult>
  syncLiabilities(accessToken: string): Promise<{
    creditCards: ProviderCreditCardDetails[]
    loans: ProviderLoanDetails[]
  }>
  disconnectItem(accessToken: string): Promise<void>
}

// Factory function to load either PlaidProvider or MockProvider based on config
export function getFinancialProvider(): FinancialProvider {
  // If Plaid client ID is not configured, always fallback to MockProvider
  const isPlaidConfigured =
    process.env.PLAID_CLIENT_ID &&
    process.env.PLAID_SECRET &&
    process.env.PLAID_CLIENT_ID !== 'your-plaid-client-id'

  if (!isPlaidConfigured) {
    const { MockProvider } = require('./mock-provider')
    return new MockProvider()
  }

  const { PlaidProvider } = require('./plaid-provider')
  return new PlaidProvider()
}
