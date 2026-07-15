import { createAdminClient } from '@/lib/supabase/server'

/**
 * Fetches account details for the household.
 */
export async function getHouseholdAccounts(householdId: string) {
  const adminSupabase = createAdminClient()
  const { data: accounts = [] } = await adminSupabase
    .from('financial_accounts')
    .select('name, type, subtype, current_balance, available_balance, credit_limit')
    .eq('household_id', householdId)

  return accounts || []
}

/**
 * Fetches recent transactions for the household.
 */
export async function getHouseholdTransactions(
  householdId: string,
  limit = 20,
  category?: string
) {
  const adminSupabase = createAdminClient()
  let query = adminSupabase
    .from('transactions')
    .select('date, amount, description, normalized_merchant, category, subcategory, pending')
    .eq('household_id', householdId)
    .order('date', { ascending: false })
    .limit(limit)

  if (category) {
    query = query.eq('category', category)
  }

  const { data: txs = [] } = await query
  return txs || []
}

/**
 * Fetches upcoming bill occurrences for the household.
 */
export async function getHouseholdBills(householdId: string) {
  const adminSupabase = createAdminClient()
  const { data: occurrences = [] } = await adminSupabase
    .from('bill_occurrences')
    .select('expected_amount, due_date, status, bill:bills(name, frequency, autopay)')
    .eq('household_id', householdId)
    .in('status', ['upcoming', 'due_soon', 'overdue'])
    .order('due_date', { ascending: true })

  return (occurrences || []).map((occ: any) => ({
    name: occ.bill?.name || 'Unmapped Bill',
    expectedAmount: occ.expected_amount,
    dueDate: occ.due_date,
    status: occ.status,
    frequency: occ.bill?.frequency || 'monthly',
    autopay: occ.bill?.autopay || false,
  }))
}

/**
 * Fetches savings goal list for the household.
 */
export async function getHouseholdSavingsGoals(householdId: string) {
  const adminSupabase = createAdminClient()
  const { data: goals = [] } = await adminSupabase
    .from('savings_goals')
    .select('name, target_amount, current_amount, target_date, monthly_target_contribution, on_track_status')
    .eq('household_id', householdId)
    .order('priority', { ascending: true })

  return goals || []
}
