import { createAdminClient } from '@/lib/supabase/server'

export interface ForecastDataPoint {
  date: string
  balance: number
  inflow: number
  outflow: number
  overdraftAlert: boolean
  events: Array<{ name: string; amount: number; type: 'income' | 'bill' }>
}

/**
 * Projects daily liquid cash balances over a specified window (default 30 days).
 */
export async function generateCashFlowForecast(householdId: string, daysToForecast = 30): Promise<{
  forecast: ForecastDataPoint[]
  hasOverdraftRisk: boolean
  firstOverdraftDate: string | null
}> {
  const adminSupabase = createAdminClient()

  // 1. Get liquid assets starting balance (Checking + Savings depository accounts)
  const { data: accounts = [] } = await adminSupabase
    .from('financial_accounts')
    .select('current_balance')
    .eq('household_id', householdId)
    .eq('type', 'depository')
    .in('subtype', ['checking', 'savings'])

  const startingBalance = (accounts || []).reduce((acc: number, curr: any) => acc + Number(curr.current_balance), 0)

  // 2. Fetch scheduled bill occurrences inside the forecast window
  const today = new Date()
  const endDate = new Date(today.getTime() + daysToForecast * 24 * 60 * 60 * 1000)
  const todayStr = today.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  const { data: billOccurrences = [] } = await adminSupabase
    .from('bill_occurrences')
    .select('expected_amount, due_date, bill:bills(name)')
    .eq('household_id', householdId)
    .in('status', ['upcoming', 'due_soon', 'overdue'])
    .gte('due_date', todayStr)
    .lte('due_date', endDateStr)

  // 3. Fetch active recurring income streams to project paydays
  const { data: incomeStreams = [] } = await adminSupabase
    .from('income_streams')
    .select('*')
    .eq('household_id', householdId)
    .eq('active', true)

  // 4. Build a daily ledger of scheduled events
  const ledger = new Map<string, { inflows: number; outflows: number; events: any[] }>()

  // Initialize all days in the forecast window
  for (let i = 0; i <= daysToForecast; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split('T')[0]
    ledger.set(dateStr, { inflows: 0, outflows: 0, events: [] })
  }

  // Populate bill occurrences in ledger
  for (const occ of billOccurrences) {
    const dateStr = occ.due_date
    if (ledger.has(dateStr)) {
      const day = ledger.get(dateStr)!
      const amount = Number(occ.expected_amount)
      day.outflows += amount
      day.events.push({
        name: (occ.bill as any)?.name || 'Bill Payment',
        amount: -amount,
        type: 'bill',
      })
    }
  }

  // Project income stream paydays inside forecast window
  for (const stream of incomeStreams) {
    const amount = Number(stream.typical_amount)
    const lastPaydate = new Date(stream.last_date)
    const frequency = stream.frequency // weekly, biweekly, monthly, semimonthly

    let nextPaydate = new Date(lastPaydate.getTime())

    // Project paydays from the last payday forward until we exceed our forecast window
    while (nextPaydate.getTime() <= endDate.getTime()) {
      // Calculate next payday based on frequency
      if (frequency === 'weekly') {
        nextPaydate = new Date(nextPaydate.getTime() + 7 * 24 * 60 * 60 * 1000)
      } else if (frequency === 'biweekly') {
        nextPaydate = new Date(nextPaydate.getTime() + 14 * 24 * 60 * 60 * 1000)
      } else if (frequency === 'monthly') {
        nextPaydate = new Date(nextPaydate.getFullYear(), nextPaydate.getMonth() + 1, nextPaydate.getDate())
      } else if (frequency === 'semimonthly') {
        // Semi-monthly typically runs 15 days apart, e.g. 15th and last day of month.
        // For simplicity, add 15 days.
        nextPaydate = new Date(nextPaydate.getTime() + 15 * 24 * 60 * 60 * 1000)
      } else {
        // Irregular: skip projection to prevent infinite loop or inaccurate guess
        break
      }

      const dateStr = nextPaydate.toISOString().split('T')[0]
      if (ledger.has(dateStr)) {
        const day = ledger.get(dateStr)!
        day.inflows += amount
        day.events.push({
          name: stream.name || 'Income Deposit',
          amount: amount,
          type: 'income',
        })
      }
    }
  }

  // 5. Generate daily balance projection
  const forecast: ForecastDataPoint[] = []
  let currentBalance = startingBalance
  let hasOverdraftRisk = false
  let firstOverdraftDate: string | null = null
  const safetyThreshold = 100 // Flag balance below $100 as risk

  for (let i = 0; i <= daysToForecast; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split('T')[0]
    const dayLedger = ledger.get(dateStr) || { inflows: 0, outflows: 0, events: [] }

    // Apply ledger updates
    currentBalance = currentBalance + dayLedger.inflows - dayLedger.outflows
    const overdraftAlert = currentBalance < safetyThreshold

    if (overdraftAlert && !hasOverdraftRisk) {
      hasOverdraftRisk = true
      firstOverdraftDate = dateStr
    }

    forecast.push({
      date: dateStr,
      balance: Number(currentBalance.toFixed(2)),
      inflow: Number(dayLedger.inflows.toFixed(2)),
      outflow: Number(dayLedger.outflows.toFixed(2)),
      overdraftAlert,
      events: dayLedger.events,
    })
  }

  return {
    forecast,
    hasOverdraftRisk,
    firstOverdraftDate,
  }
}
