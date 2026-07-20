import { createAdminClient } from '@/lib/supabase/server'

interface PredictionResult {
  predictedDay: number
  confidence: 'high' | 'medium' | 'none'
  lastPayments: string[]
  nextDueDate: string
}

/**
 * Predicts the next due date for a bill based on the last 3 months of transaction history.
 */
export async function predictNextDueDate(
  billName: string,
  householdId: string
): Promise<PredictionResult | null> {
  const adminSupabase = createAdminClient()

  // 1. Fetch transactions matching this bill name in the last 120 days
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 120)
  const startDateStr = startDate.toISOString().split('T')[0]

  const { data: txs, error } = await adminSupabase
    .from('transactions')
    .select('date, amount')
    .eq('household_id', householdId)
    .gte('date', startDateStr)
    .order('date', { ascending: false })

  if (error || !txs || txs.length === 0) {
    return null
  }

  // 2. Filter transactions that match the bill name (fuzzy match)
  const cleanName = billName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const matches = txs.filter((tx: any) => {
    const descClean = (tx.description || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const merchantClean = (tx.normalized_merchant || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    return descClean.includes(cleanName) || cleanName.includes(descClean) ||
           merchantClean.includes(cleanName) || cleanName.includes(merchantClean)
  })

  // We need at least 2 matching occurrences to analyze a pattern
  if (matches.length < 2) {
    return null
  }

  // 3. Extract the day of the month for each transaction
  const days = matches.map((tx: any) => {
    const d = new Date(tx.date + 'T12:00:00')
    return d.getDate()
  })

  // Calculate median day of the month
  const sortedDays = [...days].sort((a, b) => a - b)
  const mid = Math.floor(sortedDays.length / 2)
  const predictedDay = sortedDays.length % 2 !== 0 ? sortedDays[mid] : Math.round((sortedDays[mid - 1] + sortedDays[mid]) / 2)

  // 4. Calculate variance to check consistency
  const maxDay = Math.max(...days)
  const minDay = Math.min(...days)
  const spread = maxDay - minDay

  // If the spread is large, check if it wraps around the end/start of month (e.g., 31st and 1st)
  let adjustedSpread = spread
  if (spread > 20) {
    // If days are e.g. [31, 30, 1, 2], map 1, 2 to 32, 33 to check actual variance
    const wrappedDays = days.map((d: number) => d < 10 ? d + 31 : d)
    adjustedSpread = Math.max(...wrappedDays) - Math.min(...wrappedDays)
  }

  let confidence: 'high' | 'medium' | 'none' = 'none'
  if (adjustedSpread <= 3) {
    confidence = 'high' // Highly consistent (e.g. 14th, 15th, 15th)
  } else if (adjustedSpread <= 6) {
    confidence = 'medium' // Moderately consistent (e.g. 12th, 15th, 17th)
  } else {
    return null // Too much variance to predict safely
  }

  // 5. Calculate the next due date based on the predicted day of the month
  const today = new Date()
  let targetYear = today.getFullYear()
  let targetMonth = today.getMonth() // 0-indexed

  // Create date for the predicted day in the current month
  // Handle months with fewer days than the predicted day (e.g., Feb 30th)
  const daysInCurrentMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  const currentMonthDay = Math.min(predictedDay, daysInCurrentMonth)
  const currentMonthDueDate = new Date(targetYear, targetMonth, currentMonthDay, 12, 0, 0)

  // If that date has already passed, move to the next month
  if (currentMonthDueDate < today) {
    targetMonth += 1
    if (targetMonth > 11) {
      targetMonth = 0
      targetYear += 1
    }
  }

  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  const finalDay = Math.min(predictedDay, daysInTargetMonth)
  
  // Format next due date as YYYY-MM-DD
  const mm = String(targetMonth + 1).padStart(2, '0')
  const dd = String(finalDay).padStart(2, '0')
  const nextDueDate = `${targetYear}-${mm}-${dd}`

  return {
    predictedDay,
    confidence,
    lastPayments: matches.map((m: any) => m.date).slice(0, 3),
    nextDueDate
  }
}

/**
 * Iterates through all bills in a household, runs the prediction engine,
 * and automatically self-corrects the upcoming checklist occurrence due dates.
 */
export async function autoUpdateBillDueDates(householdId: string): Promise<void> {
  const adminSupabase = createAdminClient()
  
  const { data: bills, error: billsErr } = await adminSupabase
    .from('bills')
    .select('id, name')
    .eq('household_id', householdId)

  if (billsErr || !bills || bills.length === 0) return

  for (const bill of bills) {
    try {
      const prediction = await predictNextDueDate(bill.name, householdId)
      if (prediction && (prediction.confidence === 'high' || prediction.confidence === 'medium')) {
        // Find upcoming occurrences for this bill that are not marked paid
        const { data: occurrences } = await adminSupabase
          .from('bill_occurrences')
          .select('id, due_date')
          .eq('bill_id', bill.id)
          .in('status', ['upcoming', 'due_soon', 'overdue'])

        if (occurrences && occurrences.length > 0) {
          for (const occ of occurrences) {
            // Update the checklist occurrence due date to match the prediction
            if (occ.due_date !== prediction.nextDueDate) {
              await adminSupabase
                .from('bill_occurrences')
                .update({ due_date: prediction.nextDueDate })
                .eq('id', occ.id)
              
              console.log(`[Predictor] Auto-adjusted "${bill.name}" due date from ${occ.due_date} to predicted: ${prediction.nextDueDate}`)
            }
          }
        }
      }
    } catch (err) {
      console.error(`Failed to auto-correct due date for bill: ${bill.name}`, err)
    }
  }
}
