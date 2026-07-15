import { FinancialProvider } from './provider'
import {
  ProviderAccount,
  ProviderCreditCardDetails,
  ProviderLoanDetails,
  SyncTransactionsResult
} from './types'

export class MockProvider implements FinancialProvider {
  async createLinkToken(userId: string, householdId: string): Promise<string> {
    return `mock_link_token_${userId}_${householdId}`
  }

  async exchangePublicToken(publicToken: string): Promise<{
    accessToken: string
    itemId: string
    institutionName: string
  }> {
    return {
      accessToken: `mock_access_token_${Date.now()}`,
      itemId: `mock_item_id_${Math.floor(Math.random() * 1000000)}`,
      institutionName: 'Mock Sandbox Bank',
    }
  }

  async syncAccounts(accessToken: string): Promise<ProviderAccount[]> {
    return [
      {
        id: 'mock_acc_checking',
        name: 'Mock Checking Account',
        type: 'depository',
        subtype: 'checking',
        mask: '9840',
        currentBalance: 4520.50,
        availableBalance: 4480.20,
        creditLimit: null,
      },
      {
        id: 'mock_acc_savings',
        name: 'Mock Savings Account',
        type: 'depository',
        subtype: 'savings',
        mask: '2194',
        currentBalance: 45830.00,
        availableBalance: 45830.00,
        creditLimit: null,
      },
      {
        id: 'mock_acc_credit',
        name: 'Mock Credit Card',
        type: 'credit',
        subtype: 'credit card',
        mask: '4291',
        currentBalance: 1240.80,
        availableBalance: 18759.20,
        creditLimit: 20000.00,
      }
    ]
  }

  async syncTransactions(accessToken: string, cursor?: string): Promise<SyncTransactionsResult> {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Cursor Paging Simulation:
    // 1. First sync (no cursor): returns initial historical transactions.
    // 2. Second sync (with cursor_1): returns incremental transaction updates (e.g. a new transaction).
    // 3. Subsequent syncs (with cursor_2+): returns empty updates (up to date).
    if (!cursor) {
      return {
        added: [
          {
            id: 'mock_tx_salary_1',
            accountId: 'mock_acc_checking',
            amount: -4200.00, // Negative is income in Plaid standard
            date: fourDaysAgo,
            description: 'GOOGLE PAYROLL DIRECT DEP',
            merchantName: 'Google Inc Payroll',
            category: 'Income',
            subcategory: 'Salary',
            pending: false,
          },
          {
            id: 'mock_tx_netflix',
            accountId: 'mock_acc_credit',
            amount: 22.99,
            date: threeDaysAgo,
            description: 'NETFLIX.COM DIGITAL SUBS',
            merchantName: 'Netflix',
            category: 'Entertainment',
            subcategory: 'Subscriptions',
            pending: false,
          },
          {
            id: 'mock_tx_comcast',
            accountId: 'mock_acc_checking',
            amount: 84.99,
            date: yesterday,
            description: 'COMCAST CABLE WEB PYMT',
            merchantName: 'Xfinity Comcast',
            category: 'Utilities',
            subcategory: 'Internet',
            pending: false,
          }
        ],
        modified: [],
        removed: [],
        nextCursor: 'mock_cursor_stage_1',
      }
    }

    if (cursor === 'mock_cursor_stage_1') {
      return {
        added: [
          {
            id: 'mock_tx_new_grocery',
            accountId: 'mock_acc_credit',
            amount: 112.50,
            date: today,
            description: 'WHOLEFOODS MARKET NEW YORK',
            merchantName: 'Whole Foods',
            category: 'Food',
            subcategory: 'Groceries',
            pending: true, // Simulate pending transaction first
          }
        ],
        modified: [],
        removed: [],
        nextCursor: 'mock_cursor_stage_2',
      }
    }

    // Up to date
    return {
      added: [],
      modified: [],
      removed: [],
      nextCursor: cursor,
    }
  }

  async syncLiabilities(accessToken: string): Promise<{
    creditCards: ProviderCreditCardDetails[]
    loans: ProviderLoanDetails[]
  }> {
    const today = new Date()
    const cardDueDate = new Date(today.getFullYear(), today.getMonth(), 25).toISOString().split('T')[0]
    const statementCloseDate = new Date(today.getFullYear(), today.getMonth() - 1, 28).toISOString().split('T')[0]

    return {
      creditCards: [
        {
          accountId: 'mock_acc_credit',
          statementBalance: 850.20,
          minimumPayment: 35.00,
          dueDate: cardDueDate,
          statementClosingDate: statementCloseDate,
        }
      ],
      loans: [],
    }
  }

  async disconnectItem(accessToken: string): Promise<void> {
    return Promise.resolve()
  }
}
