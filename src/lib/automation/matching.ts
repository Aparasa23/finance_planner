import { createAdminClient } from '@/lib/supabase/server'

interface MatchCandidate {
  occurrenceId: string
  score: number
  billId: string
  expectedAmount: number
  dueDate: string
}

/**
 * Calculates string similarity (fuzzy match) based on token overlap
 */
export function getMerchantSimilarity(s1: string, s2: string): number {
  const clean = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(' ')
      .filter((w) => w.length > 2)

  const tokens1 = clean(s1)
  const tokens2 = clean(s2)

  if (tokens1.length === 0 || tokens2.length === 0) {
    // Fallback to substring check
    const raw1 = s1.toLowerCase().trim()
    const raw2 = s2.toLowerCase().trim()
    if (raw1.includes(raw2) || raw2.includes(raw1)) return 80
    return 0
  }

  // Count overlaps
  const intersection = tokens1.filter((t) => tokens2.includes(t))
  const unionSize = new Set([...tokens1, ...tokens2]).size

  return Math.round((intersection.length / unionSize) * 100)
}

/**
 * Processes a single transaction and matches it against open bill occurrences.
 */
export async function matchTransactionToBill(transactionId: string): Promise<{ matched: boolean; occurrenceId?: string; score?: number }> {
  const adminSupabase = createAdminClient()

  // 1. Fetch transaction details
  const { data: tx, error: txError } = await adminSupabase
    .from('transactions')
    .select('*, financial_accounts(type)')
    .eq('id', transactionId)
    .single()

  if (txError || !tx) return { matched: false }

  // Only match expenses (positive amounts)
  const txAmount = Number(tx.amount)
  if (txAmount <= 0) return { matched: false }

  const txDate = new Date(tx.date)
  const txMerchant = tx.normalized_merchant || tx.description || ''

  // Special Rule: Auto-detect Apple Card bill payments from checking to reduce Apple Card manual balance
  const merchantLower = txMerchant.toLowerCase()
  const isAppleCard = merchantLower.includes('apple card') || merchantLower.includes('applecard')
  const isGS = merchantLower.includes('goldman sachs') || merchantLower.includes('gs bank') || merchantLower.includes('gsbank')
  const isPmt = merchantLower.includes('pmt') || merchantLower.includes('payment') || merchantLower.includes('bill')

  if ((isAppleCard && isPmt) || isGS) {
    const { data: appleAccount } = await adminSupabase
      .from('financial_accounts')
      .select('id, current_balance')
      .eq('household_id', tx.household_id)
      .eq('name', 'Apple Card')
      .single()

    if (appleAccount) {
      const currentBal = appleAccount.current_balance || 0
      const newBal = Math.max(0, currentBal - txAmount)
      await adminSupabase
        .from('financial_accounts')
        .update({ current_balance: newBal })
        .eq('id', appleAccount.id)
      
      console.log(`Auto-detected Apple Card payment of $${txAmount}. Reduced Apple Card balance from $${currentBal} to $${newBal}.`)
    }
  }

  // 2. Fetch upcoming, due, or overdue occurrences within a +/- 7-day window
  const startDate = new Date(txDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = new Date(txDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: occurrences = [] } = await adminSupabase
    .from('bill_occurrences')
    .select('id, expected_amount, due_date, status, bill:bills(id, name, is_fixed)')
    .eq('household_id', tx.household_id)
    .in('status', ['upcoming', 'due_soon', 'overdue'])
    .gte('due_date', startDate)
    .lte('due_date', endDate)

  if (!occurrences || occurrences.length === 0) return { matched: false }

  const candidates: MatchCandidate[] = []

  // 3. Compute weighted match scores
  for (const occ of occurrences) {
    const bill = occ.bill as any
    if (!bill) continue

    // A. Merchant Similarity (Weight: 45%)
    const merchantScore = getMerchantSimilarity(txMerchant, bill.name)

    // B. Amount Closeness (Weight: 35%)
    const expected = Number(occ.expected_amount)
    let amountScore = 0
    if (expected === txAmount) {
      amountScore = 100
    } else {
      const diff = Math.abs(expected - txAmount)
      const pctDiff = diff / expected
      if (pctDiff <= 0.20) {
        amountScore = Math.round(100 * (1 - pctDiff))
      } else if (!bill.is_fixed) {
        // Variable bills (like utilities) get partial credit for matching merchant even if amount differs
        amountScore = 30
      }
    }

    // C. Date Proximity (Weight: 20%)
    const dueTime = new Date(occ.due_date).getTime()
    const txTime = txDate.getTime()
    const daysDiff = Math.abs(dueTime - txTime) / (24 * 60 * 60 * 1000)
    let dateScore = 0
    if (daysDiff <= 7) {
      dateScore = Math.round(100 * (1 - daysDiff / 7))
    }

    // Final Weighted Score
    const finalScore = (merchantScore * 0.45) + (amountScore * 0.35) + (dateScore * 0.20)

    if (finalScore >= 60) {
      candidates.push({
        occurrenceId: occ.id,
        score: Math.round(finalScore),
        billId: bill.id,
        expectedAmount: expected,
        dueDate: occ.due_date,
      })
    }
  }

  if (candidates.length === 0) return { matched: false }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score)
  const bestMatch = candidates[0]

  const isAutoMatch = bestMatch.score >= 85

  // 4. Record payment match
  const { data: match } = await adminSupabase
    .from('payment_matches')
    .insert({
      transaction_id: transactionId,
      bill_occurrence_id: bestMatch.occurrenceId,
      match_score: bestMatch.score,
      auto_accepted: isAutoMatch,
      user_overridden: false,
    })
    .select()
    .single()

  if (isAutoMatch) {
    // 5. Update occurrence state
    await adminSupabase
      .from('bill_occurrences')
      .update({
        status: 'paid',
        actual_payment_date: tx.date,
        actual_amount: txAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bestMatch.occurrenceId)

    // 6. Check if this bill is linked to an Installment Plan
    const { data: linkedInstallment } = await adminSupabase
      .from('installment_plans')
      .select('*')
      .eq('household_id', tx.household_id)
      .eq('bill_id', bestMatch.billId)
      .single()

    if (linkedInstallment) {
      const completed = Number(linkedInstallment.payments_completed) + 1
      const scheduled = Number(linkedInstallment.total_scheduled_payments)
      const remaining = Math.max(0, scheduled - completed)
      const principalPaid = Number(linkedInstallment.principal_paid) + (txAmount - Number(linkedInstallment.fees)) // simple estimate
      const remainingPrincipal = Math.max(0, Number(linkedInstallment.financed_principal) - principalPaid)

      await adminSupabase
        .from('installment_plans')
        .update({
          payments_completed: completed,
          payments_remaining: remaining,
          total_amount_paid: Number(linkedInstallment.total_amount_paid) + txAmount,
          principal_paid: Number(principalPaid.toFixed(2)),
          remaining_principal: Number(remainingPrincipal.toFixed(2)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', linkedInstallment.id)
    }

    // 7. Push notification log
    await adminSupabase.from('notifications').insert({
      household_id: tx.household_id,
      title: 'Bill Automatically Paid',
      message: `We matched your transaction at ${txMerchant} ($${txAmount.toFixed(2)}) against your bill due on ${new Date(bestMatch.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
      status: 'pending_delivery',
      notification_type: 'bill_match',
      payload: { transaction_id: transactionId, bill_occurrence_id: bestMatch.occurrenceId },
    })

    return { matched: true, occurrenceId: bestMatch.occurrenceId, score: bestMatch.score }
  } else {
    // flag for manual verification notification
    await adminSupabase.from('notifications').insert({
      household_id: tx.household_id,
      title: 'Review Potential Bill Match',
      message: `We found a matching payment at ${txMerchant} ($${txAmount.toFixed(2)}) that looks like your upcoming bill due on ${new Date(bestMatch.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Confirm this match.`,
      status: 'pending_delivery',
      notification_type: 'bill_match_review',
      payload: { transaction_id: transactionId, bill_occurrence_id: bestMatch.occurrenceId },
    })
  }

  return { matched: false, occurrenceId: bestMatch.occurrenceId, score: bestMatch.score }
}

/**
 * Checks for bills that are past due and flags them as overdue, sending alert notifications.
 */
export async function checkOverdueBills(householdId: string): Promise<number> {
  const adminSupabase = createAdminClient()

  // Find occurrences due 3+ days ago that are still 'upcoming' or 'due_soon'
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: overdueOccurrences = [] } = await adminSupabase
    .from('bill_occurrences')
    .select('id, expected_amount, due_date, bill:bills(name)')
    .eq('household_id', householdId)
    .in('status', ['upcoming', 'due_soon'])
    .lte('due_date', threeDaysAgo)

  if (!overdueOccurrences || overdueOccurrences.length === 0) return 0

  let count = 0
  for (const occ of overdueOccurrences) {
    // Mark overdue
    await adminSupabase
      .from('bill_occurrences')
      .update({
        status: 'overdue',
        updated_at: new Date().toISOString(),
      })
      .eq('id', occ.id)

    // Notify household
    const billName = (occ.bill as any)?.name || 'Upcoming Bill'
    await adminSupabase.from('notifications').insert({
      household_id: householdId,
      title: 'Missing Bill Payment Alert',
      message: `Your payment for ${billName} ($${Number(occ.expected_amount).toFixed(2)}) was due on ${new Date(occ.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. We couldn't find a matching bank transaction.`,
      status: 'pending_delivery',
      notification_type: 'bill_overdue',
      payload: { bill_occurrence_id: occ.id },
    })

    count++
  }

  return count
}

/**
 * Analyze an unmatched transaction using Gemini to detect potential subscriptions or bills.
 */
export async function checkForPotentialSubscription(transactionId: string): Promise<boolean> {
  const adminSupabase = createAdminClient()

  // 1. Fetch transaction details
  const { data: tx } = await adminSupabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (!tx || Number(tx.amount) <= 0) return false

  const merchantName = tx.normalized_merchant || tx.description
  if (!merchantName) return false

  try {
    // 2. Check if a recurring stream or bill already exists for this merchant in this household
    const { data: existingBill } = await adminSupabase
      .from('bills')
      .select('id')
      .eq('household_id', tx.household_id)
      .eq('name', merchantName)
      .maybeSingle()

    if (existingBill) return false

    const { data: existingStream } = await adminSupabase
      .from('recurring_streams')
      .select('id')
      .eq('household_id', tx.household_id)
      .eq('merchant_name', merchantName)
      .maybeSingle()

    if (existingStream) return false

    // 3. Classify with Gemini
    const { classifyTransactionCategory } = await import('@/lib/assistant/gemini')
    const classification = await classifyTransactionCategory(merchantName)

    if (classification.isRecurring && classification.confidence >= 0.7) {
      // 4. Calculate expected next due date
      const txDate = new Date(tx.date)
      const expectedNextDate = new Date(txDate)
      if (classification.frequency === 'monthly') {
        expectedNextDate.setMonth(expectedNextDate.getMonth() + 1)
      } else if (classification.frequency === 'annually') {
        expectedNextDate.setFullYear(expectedNextDate.getFullYear() + 1)
      } else if (classification.frequency === 'semiannually') {
        expectedNextDate.setMonth(expectedNextDate.getMonth() + 6)
      } else {
        expectedNextDate.setDate(expectedNextDate.getDate() + 14) // default biweekly
      }
      const formattedNextDate = expectedNextDate.toISOString().split('T')[0]

      // 5. Insert stream as unconfirmed
      const { data: stream } = await adminSupabase
        .from('recurring_streams')
        .insert({
          household_id: tx.household_id,
          merchant_name: merchantName,
          display_name: classification.suggestedName,
          category: classification.category,
          frequency: classification.frequency,
          typical_amount: Number(tx.amount),
          expected_next_date: formattedNextDate,
          user_confirmed: false,
          confidence_score: classification.confidence,
        })
        .select()
        .single()

      // 6. Push notification
      if (stream) {
        await adminSupabase.from('notifications').insert({
          household_id: tx.household_id,
          title: 'New Subscription Detected',
          message: `Gemini detected a new recurring payment to ${classification.suggestedName} ($${Number(tx.amount).toFixed(2)}/mo). Confirm this to track it in your checklist.`,
          status: 'pending_delivery',
          notification_type: 'bill_match_review',
          payload: { stream_id: stream.id, transaction_id: transactionId },
        })
        return true
      }
    }
  } catch (err) {
    console.error('Error in potential subscription check:', err)
  }

  return false
}
