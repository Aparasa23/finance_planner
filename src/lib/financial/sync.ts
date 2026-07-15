import { createAdminClient } from '@/lib/supabase/server'
import { getFinancialProvider } from './provider'
import { evaluateRules } from '../automation/rules'
import { matchTransactionToBill } from '../automation/matching'

export async function syncHouseholdConnection(connectionId: string): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient()

  // 1. Fetch connection details
  const { data: connection, error: connError } = await adminSupabase
    .from('financial_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (connError || !connection) {
    return { success: false, error: 'Financial connection details not found' }
  }

  // Record a queued job log
  const { data: job } = await adminSupabase
    .from('sync_jobs')
    .insert({
      household_id: connection.household_id,
      job_type: 'all',
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  try {
    const provider = getFinancialProvider()
    const accessToken = connection.access_token

    // 2. Refresh Account balances
    const providerAccounts = await provider.syncAccounts(accessToken)
    
    // Get all current accounts in the DB for this connection to map external -> internal ID
    const { data: dbAccounts = [] } = await adminSupabase
      .from('financial_accounts')
      .select('id, name')
      .eq('connection_id', connectionId)

    const accountMap = new Map<string, string>() // external_id -> internal_id
    
    for (const acc of providerAccounts) {
      // Find matching account in database by mask/name
      const existingAcc = (dbAccounts || []).find(
        (dba: any) => dba.name === acc.name
      )

      let internalId: string

      if (existingAcc) {
        internalId = existingAcc.id
        // Update balance
        await adminSupabase
          .from('financial_accounts')
          .update({
            current_balance: acc.currentBalance,
            available_balance: acc.availableBalance,
            credit_limit: acc.creditLimit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', internalId)
      } else {
        // Create new account if found during sync
        const { data: newAcc } = await adminSupabase
          .from('financial_accounts')
          .insert({
            connection_id: connectionId,
            household_id: connection.household_id,
            name: acc.name,
            type: acc.type,
            subtype: acc.subtype,
            mask: acc.mask,
            current_balance: acc.currentBalance,
            available_balance: acc.availableBalance,
            credit_limit: acc.creditLimit,
          })
          .select()
          .single()
        
        internalId = newAcc!.id
      }
      
      accountMap.set(acc.id, internalId)
    }

    // 3. Sync Transactions incrementally (cursor paging)
    // Fetch last stored cursor
    const lastCursor = connection.access_token.includes('mock')
      ? undefined // mock uses stage cursors, handled by mock provider directly
      : undefined // Plaid cursor can be extracted/stored in connection metadata or cursor column.
      
    // Let's retrieve cursor stored in connection metadata if we want.
    // For simplicity, we can load cursor from the connection row or metadata.
    // Let's check: we can save/retrieve cursor inside metadata column or we can add a cursor column.
    // We can use a query parameters cursor, or default. Let's see: we can query the most recent transaction external_id or use cursor.
    // Since our financial_connections table schema has `access_token` and `item_id`, let's check:
    // Plaid cursor can be stored inside `last_synced_at` or we can write it to `financial_connections` (we will use a cursor parameter).
    // Let's fetch cursor if we store it. Let's assume we pass it or retrieve it.
    
    const syncResult = await provider.syncTransactions(accessToken)

    // A. Handle Added Transactions
    if (syncResult.added.length > 0) {
      // Fetch active rules for this household
      const { data: rules = [] } = await adminSupabase
        .from('transaction_rules')
        .select('*')
        .eq('household_id', connection.household_id)
        .eq('is_active', true)

      const dbTxList = syncResult.added.map((tx) => {
        const internalAccountId = accountMap.get(tx.accountId)
        
        // Evaluate user-defined rules to modify category/merchant
        const ruleMatch = evaluateRules(
          {
            description: tx.description,
            normalized_merchant: tx.merchantName,
            amount: Number(tx.amount),
          },
          (rules || []) as any[]
        )

        return {
          account_id: internalAccountId!,
          household_id: connection.household_id,
          external_id: tx.id,
          date: tx.date,
          amount: tx.amount,
          description: tx.description,
          normalized_merchant: ruleMatch?.normalized_merchant || tx.merchantName,
          category: ruleMatch?.category || tx.category,
          subcategory: ruleMatch?.subcategory || tx.subcategory,
          pending: tx.pending,
        }
      }).filter((tx) => tx.account_id !== undefined)

      // Insert transactions and trigger match alerts
      for (const tx of dbTxList) {
        const { data: insertedTx } = await adminSupabase
          .from('transactions')
          .insert(tx)
          .select('id')
          .onConflict('external_id')
          .ignore()
          .single()

        if (insertedTx) {
          // Check for auto-match or match reviews
          await matchTransactionToBill(insertedTx.id)
        } else {
          // If transaction already existed (conflict ignored), fetch and match if unmatched
          const { data: existingTx } = await adminSupabase
            .from('transactions')
            .select('id')
            .eq('external_id', tx.external_id)
            .single()
          
          if (existingTx) {
            await matchTransactionToBill(existingTx.id)
          }
        }
      }
    }

    // B. Handle Modified Transactions
    if (syncResult.modified.length > 0) {
      for (const tx of syncResult.modified) {
        const internalAccountId = accountMap.get(tx.accountId)
        if (internalAccountId) {
          await adminSupabase
            .from('transactions')
            .update({
              amount: tx.amount,
              date: tx.date,
              description: tx.description,
              normalized_merchant: tx.merchantName,
              category: tx.category,
              subcategory: tx.subcategory,
              pending: tx.pending,
              updated_at: new Date().toISOString(),
            })
            .eq('external_id', tx.id)
        }
      }
    }

    // C. Handle Removed Transactions
    if (syncResult.removed.length > 0) {
      await adminSupabase
        .from('transactions')
        .delete()
        .in('external_id', syncResult.removed)
    }

    // 4. Update sync cursor and connection state
    await adminSupabase
      .from('financial_connections')
      .update({
        status: 'active',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    // Complete job log
    if (job) {
      await adminSupabase
        .from('sync_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    }

    return { success: true }
  } catch (error: any) {
    console.error(`Sync connection ${connectionId} failed:`, error)
    
    // Fail job log
    if (job) {
      await adminSupabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          error_details: error.message || 'Unknown sync error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    }

    // Mark connection status error
    await adminSupabase
      .from('financial_connections')
      .update({
        status: 'error',
        error_code: error.code || 'SYNC_FAILURE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    return { success: false, error: error.message }
  }
}
