import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountsManager } from '@/components/accounts-manager'

export default async function AccountsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    redirect('/register')
  }

  // Fetch accounts, connection states, and BNPL plans
  const { data: accounts = [] } = await supabase
    .from('financial_accounts')
    .select('*, connection:financial_connections(provider, status, last_synced_at)')
    .eq('household_id', profile.household_id)

  const { data: connections = [] } = await supabase
    .from('financial_connections')
    .select('id, provider, status, last_synced_at')
    .eq('household_id', profile.household_id)

  const { data: plans = [] } = await supabase
    .from('installment_plans')
    .select('*')
    .eq('household_id', profile.household_id)

  const isPlaidActive = !!(
    process.env.PLAID_CLIENT_ID &&
    process.env.PLAID_SECRET &&
    process.env.PLAID_CLIENT_ID !== 'your-plaid-client-id'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-100">Financial Accounts</h1>
        <p className="text-xs text-gray-400">Link your bank accounts, log manual assets, or track consumer installment loans.</p>
      </div>

      <AccountsManager
        initialAccounts={accounts || []}
        connections={connections || []}
        plans={plans || []}
        isPlaidActive={isPlaidActive}
      />
    </div>
  )
}
