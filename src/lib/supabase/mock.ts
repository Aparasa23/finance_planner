export function createMockSupabaseClient() {
  const getMockDataForTable = (table: string) => {
    const today = new Date()
    const thisYearMonth = today.toISOString().substring(0, 7) // e.g. "2026-07"
    
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const threeDaysAgoStr = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    switch (table) {
      case 'profiles':
        return [
          {
            id: 'demo_user_id',
            household_id: 'demo_household_id',
            email: 'demo@financeos.local',
            name: 'Demo Household User',
            role: 'admin',
          }
        ]
      case 'financial_accounts':
        return [
          // Checking Accounts
          {
            id: 'chase_checking',
            name: 'Chase Checking Account',
            type: 'depository',
            subtype: 'checking',
            current_balance: 6245.50,
            available_balance: 6200.20,
            mask: '4820',
          },
          {
            id: 'boa_checking',
            name: 'Bank of America Checking',
            type: 'depository',
            subtype: 'checking',
            current_balance: 2150.00,
            available_balance: 2150.00,
            mask: '8910',
          },
          // Credit Cards (Matching your exact list)
          {
            id: 'apple_card',
            name: 'Apple Card',
            type: 'credit',
            subtype: 'credit card',
            current_balance: 4813.00,
            available_balance: 3937.00,
            credit_limit: 8750.00,
            mask: '1284',
          },
          {
            id: 'rc_willey_card',
            name: 'R C WILLEY',
            type: 'loan',
            subtype: 'loan',
            current_balance: 4139.00,
            available_balance: 0,
            credit_limit: 0,
            mask: '3190',
          },
          {
            id: 'capone_card',
            name: 'Capital One Venture X',
            type: 'credit',
            subtype: 'credit card',
            current_balance: 1799.22,
            available_balance: 18200.78,
            credit_limit: 20000.00,
            mask: '9821',
          },
          {
            id: 'discover_card',
            name: 'Discover it® Chrome',
            type: 'credit',
            subtype: 'credit card',
            current_balance: 353.00,
            available_balance: 9647.00,
            credit_limit: 10000.00,
            mask: '6251',
          },
          {
            id: 'amex_card',
            name: 'Blue Cash Preferred® Card from American Express',
            type: 'credit',
            subtype: 'credit card',
            current_balance: 296.25,
            available_balance: 34703.75,
            credit_limit: 35000.00,
            mask: '4291',
          },
          {
            id: 'citi_card',
            name: 'Citi Simplicity® Card',
            type: 'credit',
            subtype: 'credit card',
            current_balance: 276.00,
            available_balance: 9724.00,
            credit_limit: 10000.00,
            mask: '8401',
          },
          {
            id: 'boa_rewards_card',
            name: 'Bank of America® Unlimited Cash Rewards credit card',
            type: 'credit',
            subtype: 'credit card',
            current_balance: 0.00,
            available_balance: 18600.00,
            credit_limit: 18600.00,
            mask: '1109',
          },
          {
            id: 'chase_freedom_card',
            name: 'Chase Freedom Unlimited®',
            type: 'credit',
            subtype: 'credit card',
            current_balance: 0.00,
            available_balance: 15000.00,
            credit_limit: 15000.00,
            mask: '7392',
          },
          // Loans (Auto & Mortgage)
          {
            id: 'td_auto_loan',
            name: 'TD AUTO FIN',
            type: 'loan',
            subtype: 'auto',
            current_balance: 13261.00,
            available_balance: 0,
            mask: '5820',
          },
          {
            id: 'valon_mortgage_loan',
            name: 'Valon Mortgage',
            type: 'loan',
            subtype: 'mortgage',
            current_balance: 324500.00,
            available_balance: 0,
            mask: '7920',
          },
          {
            id: '401k_loan',
            name: '401(k) Loan',
            type: 'loan',
            subtype: '401k',
            current_balance: 0.00,
            available_balance: 0,
            mask: '401K',
          }
        ]
      case 'financial_connections':
        return [
          {
            id: 'chase_conn',
            provider: 'plaid',
            status: 'active',
            last_synced_at: todayStr,
          },
          {
            id: 'amex_conn',
            provider: 'plaid',
            status: 'active',
            last_synced_at: todayStr,
          }
        ]
      case 'transactions':
        return [
          // Historic matching bills transactions (paid)
          {
            id: 'tx_valon_mortgage',
            amount: 3062.79,
            date: `${thisYearMonth}-12`,
            description: 'VALON MORTGAGE ELECTRONIC PYMT',
            normalized_merchant: 'Valon Mortgage',
            account: { name: 'Chase Checking Account' },
            category: 'Housing',
          },
          {
            id: 'tx_vasa_fitness',
            amount: 26.85,
            date: `${thisYearMonth}-08`,
            description: 'VASA FITNESS DUES ACH',
            normalized_merchant: 'VASA Fitness',
            account: { name: 'Bank of America Checking' },
            category: 'Membership',
          },
          {
            id: 'tx_comcast',
            amount: 51.13,
            date: `${thisYearMonth}-08`,
            description: 'XFINITY COMCAST AUTO-PAYMENT',
            normalized_merchant: 'Xfinity / Comcast',
            account: { name: 'Chase Checking Account' },
            category: 'Utilities',
          },
          {
            id: 'tx_netflix',
            amount: 29.00,
            date: `${thisYearMonth}-01`,
            description: 'NETFLIX.COM INTERNET SUB',
            normalized_merchant: 'Netflix',
            account: { name: 'Bank of America Checking' },
            category: 'Subscriptions',
          },
          {
            id: 'tx_vivint',
            amount: 28.65,
            date: `${thisYearMonth}-02`,
            description: 'VIVINT HOME SECURITY MONTHLY',
            normalized_merchant: 'Vivint',
            account: { name: 'Chase Checking Account' },
            category: 'Home Security',
          },
          {
            id: 'tx_grocery_wholefoods',
            amount: 145.20,
            date: yesterdayStr,
            description: 'WHOLEFOODS MARKET SALT LAKE',
            normalized_merchant: 'Whole Foods',
            account: { name: 'Chase Checking Account' },
            category: 'Groceries',
          },
          {
            id: 'tx_salary',
            amount: -4500.00,
            date: threeDaysAgoStr,
            description: 'PAYROLL DIRECT DEPOSIT INFLOW',
            normalized_merchant: 'Payroll Deposit',
            account: { name: 'Chase Checking Account' },
            category: 'Income',
          }
        ]
      case 'bill_occurrences':
        return [
          // 1. Home and Utilities
          {
            id: 'occ_valon_mortgage',
            expected_amount: 3062.79,
            due_date: `${thisYearMonth}-12`,
            status: 'paid',
            bill: { name: 'Valon Mortgage', autopay: true, frequency: 'monthly', category: 'Home & Utilities' }
          },
          {
            id: 'occ_wildflower_hoa',
            expected_amount: 102.99,
            due_date: `${thisYearMonth}-10`,
            status: 'paid',
            bill: { name: 'Wildflower Master Association (HOA)', autopay: true, frequency: 'monthly', category: 'Home & Utilities' }
          },
          {
            id: 'occ_enbridge_gas',
            expected_amount: 61.97,
            due_date: `${thisYearMonth}-15`,
            status: 'upcoming',
            bill: { name: 'Enbridge Gas', autopay: true, frequency: 'monthly', category: 'Home & Utilities' }
          },
          {
            id: 'occ_rocky_mtn_power',
            expected_amount: 65.03,
            due_date: `${thisYearMonth}-18`,
            status: 'upcoming',
            bill: { name: 'Rocky Mountain Power', autopay: true, frequency: 'monthly', category: 'Home & Utilities' }
          },
          {
            id: 'occ_saratoga_springs_city',
            expected_amount: 122.40,
            due_date: `${thisYearMonth}-17`,
            status: 'upcoming',
            bill: { name: 'City of Saratoga Springs', autopay: true, frequency: 'monthly', category: 'Home & Utilities' }
          },
          {
            id: 'occ_vivint_home',
            expected_amount: 28.65,
            due_date: `${thisYearMonth}-02`,
            status: 'paid',
            bill: { name: 'Vivint Home Security', autopay: true, frequency: 'monthly', category: 'Home & Utilities' }
          },
          // Home Audit Checklist
          {
            id: 'occ_homeowners_insurance',
            expected_amount: 0.00,
            due_date: `${thisYearMonth}-15`,
            status: 'needs_review',
            bill: { name: 'Homeowners Insurance (Check if Escrowed)', autopay: false, frequency: 'annual', category: 'Home & Utilities' }
          },
          {
            id: 'occ_property_taxes',
            expected_amount: 0.00,
            due_date: `${thisYearMonth}-15`,
            status: 'needs_review',
            bill: { name: 'Property Taxes (Check if Escrowed)', autopay: false, frequency: 'annual', category: 'Home & Utilities' }
          },
          {
            id: 'occ_home_warranty',
            expected_amount: 0.00,
            due_date: `${thisYearMonth}-01`,
            status: 'needs_review',
            bill: { name: 'Home Warranty (Identify Provider/Fee)', autopay: false, frequency: 'annual', category: 'Home & Utilities' }
          },
          {
            id: 'occ_ring_protect',
            expected_amount: 10.00,
            due_date: `${thisYearMonth}-28`,
            status: 'needs_review',
            bill: { name: 'Ring Protect Plan (Confirm if Active)', autopay: false, frequency: 'monthly', category: 'Home & Utilities' }
          },
          {
            id: 'occ_nest_aware',
            expected_amount: 8.00,
            due_date: `${thisYearMonth}-28`,
            status: 'needs_review',
            bill: { name: 'Nest Aware Subscription (Confirm if Active)', autopay: false, frequency: 'monthly', category: 'Home & Utilities' }
          },
          {
            id: 'occ_water_softener',
            expected_amount: 0.00,
            due_date: `${thisYearMonth}-15`,
            status: 'needs_review',
            bill: { name: 'Water-softener / RO Service Maintenance', autopay: false, frequency: 'monthly', category: 'Home & Utilities' }
          },

          // 2. Phone and Communications
          {
            id: 'occ_xfinity_internet',
            expected_amount: 51.13,
            due_date: `${thisYearMonth}-08`,
            status: 'paid',
            bill: { name: 'Xfinity / Comcast Internet', autopay: true, frequency: 'monthly', category: 'Phone & Communications' }
          },
          {
            id: 'occ_mobile_carrier',
            expected_amount: 0.00,
            due_date: `${thisYearMonth}-20`,
            status: 'needs_review',
            bill: { name: 'Mobile Phone Carrier (High Priority Missing Item)', autopay: false, frequency: 'monthly', category: 'Phone & Communications' }
          },
          {
            id: 'occ_device_installment',
            expected_amount: 0.00,
            due_date: `${thisYearMonth}-20`,
            status: 'needs_review',
            bill: { name: 'Device Installment Plan', autopay: false, frequency: 'monthly', category: 'Phone & Communications' }
          },
          {
            id: 'occ_phone_insurance',
            expected_amount: 0.00,
            due_date: `${thisYearMonth}-20`,
            status: 'needs_review',
            bill: { name: 'Phone Insurance / Protection Plan', autopay: false, frequency: 'monthly', category: 'Phone & Communications' }
          },

          // 3. Subscriptions, Memberships & Recurring Services
          {
            id: 'occ_netflix_sub',
            expected_amount: 29.00,
            due_date: `${thisYearMonth}-01`,
            status: 'paid',
            bill: { name: 'Netflix', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_google_one_primary',
            expected_amount: 0.53,
            due_date: `${thisYearMonth}-21`,
            status: 'upcoming',
            bill: { name: 'Google One Cloud Storage (Primary)', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_hbo_max',
            expected_amount: 11.81,
            due_date: `${thisYearMonth}-14`,
            status: 'paid',
            bill: { name: 'HBO Max', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_moviepass',
            expected_amount: 13.00,
            due_date: `${thisYearMonth}-10`,
            status: 'paid',
            bill: { name: 'MoviePass Membership', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_vasa_gym',
            expected_amount: 26.85,
            due_date: `${thisYearMonth}-08`,
            status: 'paid',
            bill: { name: 'VASA Fitness Gym', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_capone_annual_fee',
            expected_amount: 395.00,
            due_date: `${thisYearMonth}-18`,
            status: 'upcoming',
            bill: { name: 'Capital One Venture X Membership Fee', autopay: false, frequency: 'annual', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_amex_annual_fee',
            expected_amount: 95.00,
            due_date: `${thisYearMonth}-08-06`,
            status: 'upcoming',
            bill: { name: 'Amex Blue Cash Preferred Annual Fee', autopay: true, frequency: 'annual', category: 'Subscriptions & Memberships' }
          },
          // Subscriptions Checklist requiring audit
          {
            id: 'occ_gopro_sub',
            expected_amount: 0.00,
            due_date: `${thisYearMonth}-25`,
            status: 'needs_review',
            bill: { name: 'GoPro Subscription (Find amount & renewal)', autopay: false, frequency: 'annual', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_final_round_ai',
            expected_amount: 299.00,
            due_date: `${thisYearMonth}-15`,
            status: 'needs_review',
            bill: { name: 'Final Round AI Interview Prep (Check if still needed)', autopay: false, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_apple_bill_1299',
            expected_amount: 12.99,
            due_date: `${thisYearMonth}-05`,
            status: 'needs_review',
            bill: { name: 'Apple.com/Bill $12.99 (Identify app service)', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_apple_bill_2148',
            expected_amount: 21.48,
            due_date: `${thisYearMonth}-05`,
            status: 'needs_review',
            bill: { name: 'Apple.com/Bill $21.48 (Identify combined subscriptions)', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_apple_bill_299',
            expected_amount: 2.99,
            due_date: `${thisYearMonth}-05`,
            status: 'needs_review',
            bill: { name: 'Apple.com/Bill $2.99 (iCloud/app storage)', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_quick_quack_wash',
            expected_amount: 24.99,
            due_date: `${thisYearMonth}-23`,
            status: 'needs_review',
            bill: { name: 'Quick Quack Car Wash Membership', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_swish_sports',
            expected_amount: 4.28,
            due_date: `${thisYearMonth}-12`,
            status: 'needs_review',
            bill: { name: 'Google Swish Sports App', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          },
          {
            id: 'occ_google_one_duplicate',
            expected_amount: 0.52,
            due_date: `${thisYearMonth}-21`,
            status: 'needs_review',
            bill: { name: 'Google One Cloud Storage (Verify duplicate account check)', autopay: true, frequency: 'monthly', category: 'Subscriptions & Memberships' }
          }
        ]
      case 'installment_plans':
        return [
          {
            id: 'rc_willey_amortization',
            name: 'RC Willey Financing',
            provider: 'RC Willey Inc',
            financed_principal: 6000.00,
            payments_completed: 4,
            total_scheduled_payments: 12,
            payments_remaining: 8,
            regular_payment_amount: 517.43,
            remaining_principal: 4139.00,
            expected_payoff_date: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
          {
            id: 'td_auto_loan_amortization',
            name: 'TD Auto Finance Car Loan',
            provider: 'TD Auto Finance',
            financed_principal: 40000.00,
            payments_completed: 24,
            total_scheduled_payments: 36,
            payments_remaining: 12,
            regular_payment_amount: 660.62,
            remaining_principal: 13261.00,
            expected_payoff_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
          {
            id: '401k_loan_amortization',
            name: '401(k) Loan',
            provider: 'Payroll Deduction',
            financed_principal: 5000.00,
            payments_completed: 12,
            total_scheduled_payments: 36,
            payments_remaining: 24,
            regular_payment_amount: 150.00,
            remaining_principal: 0.00, // Notes: Needs Review for principal
            expected_payoff_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
          {
            id: 'valon_mortgage_amortization',
            name: 'Valon Mortgage',
            provider: 'Valon Mortgage Inc',
            financed_principal: 380000.00,
            payments_completed: 24,
            total_scheduled_payments: 360,
            payments_remaining: 336,
            regular_payment_amount: 3062.79,
            remaining_principal: 324500.00,
            expected_payoff_date: '2054-07-12',
          }
        ]
      case 'savings_goals':
        return [
          {
            id: 'mock_goal_emergency',
            name: 'Emergency Fund',
            target_amount: 30000,
            current_amount: 15450,
            target_date: '2026-12-31',
            monthly_target_contribution: 500,
            priority: 1,
            on_track_status: 'on_track',
          }
        ]
      case 'income_streams':
        return [
          {
            id: 'income_paycheck',
            name: 'Payroll Direct Deposit',
            typical_amount: 4500.00,
            frequency: 'biweekly',
            last_date: threeDaysAgoStr,
            active: true,
          }
        ]
      case 'credit_cards':
        return [
          {
            id: 'capone_details',
            account_id: 'capone_card',
            statement_balance: 1799.22,
            minimum_payment: 25.00,
            due_date: `${thisYearMonth}-18`,
            autopay_status: 'Unknown',
            annual_fee: 395.00,
            notes: 'Annual fee expected on July 2026 statement'
          },
          {
            id: 'amex_details',
            account_id: 'amex_card',
            statement_balance: 296.25,
            minimum_payment: 40.00,
            due_date: `${thisYearMonth}-08-06`, // matches 08/06/2026
            autopay_status: 'Full Statement',
            annual_fee: 95.00,
            notes: 'AutoPay $296.25 scheduled for 07/27/2026'
          },
          {
            id: 'boa_rewards_details',
            account_id: 'boa_rewards_card',
            statement_balance: 0.00,
            minimum_payment: 0.00,
            due_date: `${thisYearMonth}-24`,
            autopay_status: 'Unknown',
            notes: 'Statement showed $0 balance'
          },
          {
            id: 'citi_details',
            account_id: 'citi_card',
            statement_balance: 276.00,
            minimum_payment: 25.00,
            due_date: `${thisYearMonth}-25`,
            autopay_status: 'Autopay Observed'
          },
          {
            id: 'apple_card_details',
            account_id: 'apple_card',
            statement_balance: 4813.00,
            minimum_payment: 120.00,
            due_date: `${thisYearMonth}-31`,
            autopay_status: 'Unknown'
          },
          {
            id: 'discover_details',
            account_id: 'discover_card',
            statement_balance: 353.00,
            minimum_payment: 35.00,
            due_date: `${thisYearMonth}-20`,
            autopay_status: 'Unknown'
          }
        ]
      default:
        return []
    }
  }

  const mockQueryBuilder = (table: string) => {
    const builder = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      eq: () => builder,
      in: () => builder,
      gte: () => builder,
      lte: () => builder,
      single: async () => {
        const val = getMockDataForTable(table)
        return {
          data: Array.isArray(val) ? val[0] : val,
          error: null,
        }
      },
      order: () => builder,
      limit: () => builder,
      onConflict: () => builder,
      ignore: () => builder,
      then: (resolve: any) => {
        resolve({
          data: getMockDataForTable(table),
          error: null,
        })
      },
    }
    return builder
  }

  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: 'demo_user_id',
            email: 'demo@financeos.local',
            email_confirmed_at: new Date().toISOString(),
          },
        },
        error: null,
      }),
      getSession: async () => ({
        data: {
          session: {
            user: { id: 'demo_user_id', email: 'demo@financeos.local' },
            access_token: 'mock_session_token_123',
          },
        },
        error: null,
      }),
      signInWithPassword: async () => ({
        data: { user: { id: 'demo_user_id', email: 'demo@financeos.local' } },
        error: null,
      }),
      signUp: async () => ({
        data: { user: { id: 'demo_user_id', email: 'demo@financeos.local' } },
        error: null,
      }),
      signOut: async () => ({
        error: null,
      }),
    },
    from: (table: string) => mockQueryBuilder(table),
  } as any
}
