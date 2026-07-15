import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsManager } from '@/components/analytics-manager'

export default async function AnalyticsPage() {
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

  // Get transactions for the current month
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  
  const { data: txs = [] } = await supabase
    .from('transactions')
    .select('amount, category, description, normalized_merchant')
    .eq('household_id', profile.household_id)
    .gte('date', currentMonthStart)

  // Aggregate stats
  let totalIncome = 0
  let totalExpenses = 0
  const categoryMap = new Map<string, number>()

  for (const tx of txs || []) {
    const amt = Number(tx.amount)
    if (amt < 0) {
      // Income
      totalIncome += Math.abs(amt)
    } else {
      // Expense
      totalExpenses += amt
      const cat = tx.category || 'Uncategorized'
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + amt)
    }
  }

  // Format category list
  const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
  })).sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-100">Financial Analytics</h1>
        <p className="text-xs text-gray-400">Monthly breakdown of income streams, categories, and savings margins.</p>
      </div>

      <AnalyticsManager
        income={Number(totalIncome.toFixed(2))}
        expenses={Number(totalExpenses.toFixed(2))}
        categories={categoryBreakdown}
      />
    </div>
  )
}
