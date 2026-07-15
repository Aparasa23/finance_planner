import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarGrid } from '@/components/calendar-grid'

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function CalendarPage({ searchParams }: PageProps) {
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

  // Parse target month e.g., "2026-07"
  const params = await searchParams
  const monthParam = params.month
  
  let targetYear: number
  let targetMonth: number // 0-indexed for JS Date

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const parts = monthParam.split('-')
    targetYear = parseInt(parts[0])
    targetMonth = parseInt(parts[1]) - 1
  } else {
    const now = new Date()
    targetYear = now.getFullYear()
    targetMonth = now.getMonth()
  }

  // Calculate start and end date boundaries for database query (UTC dates boundary)
  const firstDay = new Date(targetYear, targetMonth, 1)
  const lastDay = new Date(targetYear, targetMonth + 1, 0)
  
  const startStr = firstDay.toISOString().split('T')[0]
  const endStr = lastDay.toISOString().split('T')[0]

  // Query bill occurrences
  const { data: occurrences = [] } = await supabase
    .from('bill_occurrences')
    .select('id, expected_amount, actual_amount, due_date, status, bill:bills(name, is_fixed, autopay)')
    .eq('household_id', profile.household_id)
    .gte('due_date', startStr)
    .lte('due_date', endStr)

  // Query income streams to draw projected paycheck indicators
  const { data: incomeStreams = [] } = await supabase
    .from('income_streams')
    .select('*')
    .eq('household_id', profile.household_id)
    .eq('active', true)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-100">Bill Calendar</h1>
        <p className="text-xs text-gray-400">Monthly schedule of all upcoming, paid, and overdue bills.</p>
      </div>

      <div className="glass-panel p-5 rounded-2xl">
        <CalendarGrid
          year={targetYear}
          month={targetMonth}
          occurrences={occurrences || []}
          incomeStreams={incomeStreams || []}
        />
      </div>
    </div>
  )
}
