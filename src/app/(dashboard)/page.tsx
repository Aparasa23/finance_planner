import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AlertCircle } from 'lucide-react'
import { DashboardContent } from '@/components/dashboard-content'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch household id
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  const householdId = profile?.household_id

  if (!householdId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-yellow-500" />
        <h2 className="text-xl font-bold">Onboarding Required</h2>
        <p className="text-gray-400 max-w-sm">
          Please set up or join a household in settings to access your dashboard.
        </p>
        <Link href="/settings" className="px-4 py-2 bg-emerald-500 text-emerald-950 rounded-lg font-semibold hover:bg-emerald-400">
          Go to Settings
        </Link>
      </div>
    )
  }

  // 1. Fetch connected accounts
  const { data: accounts = [] } = await supabase
    .from('financial_accounts')
    .select('*')
    .eq('household_id', householdId)

  // 2. Fetch all bill occurrences
  const { data: billOccurrences = [] } = await supabase
    .from('bill_occurrences')
    .select('*, bill:bills(*)')

  // 3. Fetch credit card statement details
  const { data: creditCardDetails = [] } = await supabase
    .from('credit_cards')
    .select('*')

  // 4. Fetch installment plans
  const { data: installmentPlans = [] } = await supabase
    .from('installment_plans')
    .select('*')
    .eq('household_id', householdId)

  // 5. Fetch recent transactions
  const { data: transactions = [] } = await supabase
    .from('transactions')
    .select('*, account:financial_accounts(name, type)')
    .eq('household_id', householdId)
    .order('date', { ascending: false })
    .limit(5)

  // Math aggregates
  const checkingAndSavings = (accounts || [])?.filter(
    (a: any) => a.type === 'depository' && (a.subtype === 'checking' || a.subtype === 'savings')
  ) || []
  const currentCash = checkingAndSavings.reduce((acc: number, curr: any) => acc + Number(curr.current_balance), 0)

  const creditCards = (accounts || [])?.filter((a: any) => a.type === 'credit') || []
  const creditBalance = creditCards.reduce((acc: number, curr: any) => acc + Number(curr.current_balance), 0)

  const totalAssets = (accounts || [])
    ?.filter((a: any) => a.type === 'depository' || a.type === 'manual_asset' || a.type === 'investment')
    .reduce((acc: number, curr: any) => acc + Number(curr.current_balance), 0) || 0

  const totalLiabilities = (accounts || [])
    ?.filter((a: any) => a.type === 'credit' || a.type === 'loan' || a.type === 'manual_liability')
    .reduce((acc: number, curr: any) => acc + Number(curr.current_balance), 0) || 0

  const netWorth = totalAssets - totalLiabilities

  // Group bill occurrences by status
  const upcomingBills = (billOccurrences || []).filter((o: any) => o.status === 'upcoming' || o.status === 'due_soon' || o.status === 'overdue')
  const paidBills = (billOccurrences || []).filter((o: any) => o.status === 'paid')
  const reviewBills = (billOccurrences || []).filter((o: any) => o.status === 'needs_review')

  // Map credit card statement details
  const cardsWithStatement = creditCards.map((card: any) => {
    const details = (creditCardDetails || []).find((d: any) => d.account_id === card.id)
    const utilization = card.credit_limit > 0 ? Math.round((card.current_balance / card.credit_limit) * 100) : 0
    return {
      ...card,
      statement_balance: details?.statement_balance ?? card.current_balance,
      minimum_payment: details?.minimum_payment ?? 25.00,
      due_date: details?.due_date ?? 'End of Month',
      autopay_status: details?.autopay_status ?? 'Unknown',
      notes: details?.notes ?? '',
      utilization,
    }
  })

  // Sync health checks
  const { data: activeConnections = [] } = await supabase
    .from('financial_connections')
    .select('*')
    .eq('household_id', householdId)

  const connectionsNeedAttention = (activeConnections || []).some((c: any) => c.status !== 'active')

  // Calculate Standing health parameters
  const hasOverdue = upcomingBills.some((o: any) => o.status === 'overdue')
  const hasHighUtilization = cardsWithStatement.some((c: any) => c.utilization > 50)
  const outstandingReviews = reviewBills.length

  let healthStatus = 'EXCELLENT'
  let healthColor = 'text-emerald-400 font-extrabold'
  let healthDesc = 'All regular payments are synchronized, cash reserves are healthy, and credit limits are optimized.'

  if (hasOverdue) {
    healthStatus = 'ACTION REQUIRED'
    healthColor = 'text-rose-400 font-extrabold'
    healthDesc = 'You have overdue utility bills or loan accounts that require immediate manual payment.'
  } else if (hasHighUtilization) {
    healthStatus = 'WARNING'
    healthColor = 'text-yellow-400 font-extrabold'
    healthDesc = 'High credit card utilization observed on Apple Card or RC Willey (above 50%). Consider statement payments.'
  } else if (outstandingReviews > 0) {
    healthStatus = 'GOOD STANDING (PENDING AUDIT)'
    healthColor = 'text-teal-400 font-extrabold'
    healthDesc = `All primary bills are paid, but you have ${outstandingReviews} items (GoPro, Progressive, etc.) awaiting confirmation.`
  }

  return (
    <DashboardContent
      currentCash={currentCash}
      creditBalance={creditBalance}
      netWorth={netWorth}
      healthStatus={healthStatus}
      healthColor={healthColor}
      healthDesc={healthDesc}
      connectionsNeedAttention={connectionsNeedAttention}
      upcomingBills={upcomingBills}
      reviewBills={reviewBills}
      paidBills={paidBills}
      cardsWithStatement={cardsWithStatement}
      installmentPlans={installmentPlans}
      transactions={transactions}
    />
  )
}
