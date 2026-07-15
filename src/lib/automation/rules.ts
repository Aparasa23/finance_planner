import { createAdminClient } from '@/lib/supabase/server'

export interface Rule {
  id: string
  pattern_type: 'contains' | 'exact' | 'starts_with' | 'ends_with'
  field_to_match: 'description' | 'merchant' | 'amount'
  pattern: string
  target_category: string
  target_subcategory: string | null
  target_merchant: string | null
  priority: number
}

/**
 * Evaluates rules against a transaction and returns updated fields if matched.
 */
export function evaluateRules(transaction: { description: string; normalized_merchant: string; amount: number }, rules: Rule[]) {
  // Sort rules by priority descending
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    let valueToMatch = ''
    if (rule.field_to_match === 'description') {
      valueToMatch = transaction.description
    } else if (rule.field_to_match === 'merchant') {
      valueToMatch = transaction.normalized_merchant
    } else if (rule.field_to_match === 'amount') {
      valueToMatch = String(transaction.amount)
    }

    let isMatch = false
    const pattern = rule.pattern.toLowerCase().trim()
    const text = valueToMatch.toLowerCase().trim()

    if (rule.field_to_match === 'amount') {
      // Numerical match check
      const numPattern = parseFloat(rule.pattern)
      const numValue = transaction.amount
      if (!isNaN(numPattern) && numPattern === numValue) {
        isMatch = true
      }
    } else {
      // String match check
      if (rule.pattern_type === 'contains' && text.includes(pattern)) {
        isMatch = true
      } else if (rule.pattern_type === 'exact' && text === pattern) {
        isMatch = true
      } else if (rule.pattern_type === 'starts_with' && text.startsWith(pattern)) {
        isMatch = true
      } else if (rule.pattern_type === 'ends_with' && text.endsWith(pattern)) {
        isMatch = true
      }
    }

    if (isMatch) {
      return {
        category: rule.target_category,
        subcategory: rule.target_subcategory,
        normalized_merchant: rule.target_merchant || transaction.normalized_merchant,
        matchedRuleId: rule.id,
      }
    }
  }

  return null
}

/**
 * Fetches rules for a household and applies them to a set of transactions.
 */
export async function applyRulesToHouseholdTransactions(householdId: string, transactionIds?: string[]): Promise<number> {
  const adminSupabase = createAdminClient()

  // 1. Fetch rules
  const { data: rules = [] } = await adminSupabase
    .from('transaction_rules')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true)

  if (!rules || rules.length === 0) return 0

  // 2. Fetch transactions (either specific ones or all from last 7 days)
  let query = adminSupabase
    .from('transactions')
    .select('*')
    .eq('household_id', householdId)

  if (transactionIds && transactionIds.length > 0) {
    query = query.in('id', transactionIds)
  } else {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    query = query.gte('date', sevenDaysAgo)
  }

  const { data: txs = [] } = await query

  if (!txs || txs.length === 0) return 0

  let updatedCount = 0

  // 3. Evaluate and update
  for (const tx of txs) {
    const match = evaluateRules(
      {
        description: tx.description,
        normalized_merchant: tx.normalized_merchant,
        amount: Number(tx.amount),
      },
      rules as Rule[]
    )

    if (match) {
      const { error } = await adminSupabase
        .from('transactions')
        .update({
          category: match.category,
          subcategory: match.subcategory,
          normalized_merchant: match.normalized_merchant,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tx.id)

      if (!error) {
        updatedCount++
      }
    }
  }

  return updatedCount
}
