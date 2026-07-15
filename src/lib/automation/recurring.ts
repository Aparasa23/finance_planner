import { createAdminClient } from '@/lib/supabase/server'

interface TxGroup {
  merchant: string
  description: string
  txs: any[]
}

/**
 * Detects recurring transactions from a household's history and writes them to recurring_streams.
 */
export async function detectRecurringStreams(householdId: string): Promise<number> {
  const adminSupabase = createAdminClient()

  // 1. Fetch transactions from the last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: txs = [] } = await adminSupabase
    .from('transactions')
    .select('*')
    .eq('household_id', householdId)
    .gte('date', ninetyDaysAgo)
    .order('date', { ascending: true })

  if (!txs || txs.length < 3) return 0

  // 2. Group transactions by merchant name (or fallback to description)
  const groups = new Map<string, TxGroup>()
  
  for (const tx of txs) {
    const key = (tx.normalized_merchant || tx.description || '').trim().toLowerCase()
    if (!key) continue

    if (!groups.has(key)) {
      groups.set(key, {
        merchant: tx.normalized_merchant || tx.description,
        description: tx.description,
        txs: [],
      })
    }
    groups.get(key)!.txs.push(tx)
  }

  let streamsDetected = 0

  // 3. Analyze each group for frequency pattern
  for (const group of groups.values()) {
    const instances = group.txs
    // Need at least 3 occurrences to find intervals
    if (instances.length < 3) continue

    // Calculate interval in days between consecutive transactions
    const intervals: number[] = []
    for (let i = 1; i < instances.length; i++) {
      const d1 = new Date(instances[i - 1].date).getTime()
      const d2 = new Date(instances[i].date).getTime()
      const diffDays = Math.round((d2 - d1) / (24 * 60 * 60 * 1000))
      intervals.push(diffDays)
    }

    // Calculate mean and standard deviation of intervals
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const variance = intervals.reduce((acc, val) => acc + Math.pow(val - avgInterval, 2), 0) / intervals.length
    const stdDev = Math.sqrt(variance)

    // If standard deviation is small relative to average interval (highly consistent days), it's recurring!
    // A standard threshold is stdDev < 4 days (for monthly/biweekly), or stdDev / avgInterval < 0.2
    const isConsistent = stdDev < 4 || (stdDev / avgInterval) < 0.18

    if (!isConsistent) continue

    // Determine standard frequency
    let frequency = 'irregular'
    if (avgInterval >= 5 && avgInterval <= 9) {
      frequency = 'weekly'
    } else if (avgInterval >= 11 && avgInterval <= 17) {
      frequency = 'biweekly'
    } else if (avgInterval >= 26 && avgInterval <= 33) {
      frequency = 'monthly'
    } else if (avgInterval >= 80 && avgInterval <= 100) {
      frequency = 'quarterly'
    } else if (avgInterval >= 170 && avgInterval <= 190) {
      frequency = 'semiannually'
    } else if (avgInterval >= 350 && avgInterval <= 380) {
      frequency = 'annually'
    }

    // Calculate amounts
    const amounts = instances.map((t) => Math.abs(Number(t.amount)))
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const minAmount = Math.min(...amounts)
    const maxAmount = Math.max(...amounts)
    
    // Auto-pay indicators in text
    const textSignature = instances.map((t) => `${t.description} ${t.normalized_merchant}`).join(' ').toLowerCase()
    const hasAutopayKeyword =
      textSignature.includes('autopay') ||
      textSignature.includes('auto-pay') ||
      textSignature.includes('aps') ||
      textSignature.includes('direct debit') ||
      textSignature.includes('subscription') ||
      textSignature.includes('recurring')

    const autopayLikelihood = hasAutopayKeyword ? 0.95 : 0.40

    // Dates
    const lastDateStr = instances[instances.length - 1].date
    const lastDate = new Date(lastDateStr)
    const nextExpectedDate = new Date(lastDate.getTime() + Math.round(avgInterval) * 24 * 60 * 60 * 1000)

    // Confidence
    const confidenceScore = Math.min(0.99, 0.6 + (instances.length - 3) * 0.1 - (stdDev / 10))

    // Upsert detected stream
    const { data: existingStream } = await adminSupabase
      .from('recurring_streams')
      .select('id')
      .eq('household_id', householdId)
      .eq('merchant_name', group.merchant)
      .single()

    const streamData = {
      household_id: householdId,
      merchant_name: group.merchant,
      description: group.description,
      frequency: frequency,
      typical_amount: Number(avgAmount.toFixed(2)),
      min_amount: Number(minAmount.toFixed(2)),
      max_amount: Number(maxAmount.toFixed(2)),
      avg_amount: Number(avgAmount.toFixed(2)),
      last_date: lastDateStr,
      next_expected_date: nextExpectedDate.toISOString().split('T')[0],
      autopay_likelihood: autopayLikelihood,
      confidence_score: Number(confidenceScore.toFixed(2)),
      status: 'active',
      updated_at: new Date().toISOString(),
    }

    if (existingStream) {
      await adminSupabase
        .from('recurring_streams')
        .update(streamData)
        .eq('id', existingStream.id)
    } else {
      await adminSupabase
        .from('recurring_streams')
        .insert({
          ...streamData,
          created_at: new Date().toISOString(),
        })
    }

    streamsDetected++
  }

  return streamsDetected
}
