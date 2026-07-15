'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getFinancialProvider } from '@/lib/financial/provider'
import { revalidatePath } from 'next/cache'

export async function getPlaidLinkToken() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized user session' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { error: 'Household onboarding required' }
  }

  try {
    const provider = getFinancialProvider()
    const linkToken = await provider.createLinkToken(user.id, profile.household_id)
    return { linkToken }
  } catch (error: any) {
    console.error('Error generating link token:', error)
    return { error: error.message || 'Failed to create Plaid Link token' }
  }
}

export async function exchangePlaidPublicToken(publicToken: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized user session' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { error: 'Household onboarding required' }
  }

  const householdId = profile.household_id

  try {
    const provider = getFinancialProvider()

    // 1. Exchange public token
    const { accessToken, itemId, institutionName } = await provider.exchangePublicToken(publicToken)

    // 2. Insert financial connection (using service role / admin client to write safely)
    const adminSupabase = createAdminClient()
    const { data: connection, error: connError } = await adminSupabase
      .from('financial_connections')
      .insert({
        household_id: householdId,
        provider: process.env.PLAID_CLIENT_ID ? 'plaid' : 'mock',
        access_token: accessToken, // In production, encrypt this token.
        item_id: itemId,
        status: 'active',
      })
      .select()
      .single()

    if (connError || !connection) {
      console.error('Database connection error:', connError)
      return { error: 'Failed to record account credentials' }
    }

    // 3. Sync accounts
    const providerAccounts = await provider.syncAccounts(accessToken)
    const insertedAccounts: any[] = []

    for (const acc of providerAccounts) {
      const { data: account, error: accError } = await adminSupabase
        .from('financial_accounts')
        .insert({
          connection_id: connection.id,
          household_id: householdId,
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

      if (account) {
        insertedAccounts.push({
          externalId: acc.id,
          internalId: account.id,
          type: account.type,
        })
      }
    }

    // Map external account ID to internal DB account ID
    const accountIdMap = new Map<string, string>()
    insertedAccounts.forEach((acc) => {
      accountIdMap.set(acc.externalId, acc.internalId)
    })

    // 4. Initial transaction sync
    const syncResult = await provider.syncTransactions(accessToken)
    if (syncResult.added.length > 0) {
      const dbTxList = syncResult.added.map((tx) => {
        const internalAccountId = accountIdMap.get(tx.accountId)
        return {
          account_id: internalAccountId!,
          household_id: householdId,
          external_id: tx.id,
          date: tx.date,
          amount: tx.amount,
          description: tx.description,
          normalized_merchant: tx.merchantName,
          category: tx.category,
          subcategory: tx.subcategory,
          pending: tx.pending,
        }
      }).filter((tx) => tx.account_id !== undefined) // remove unmapped accounts

      const { data: insertedTxs } = await adminSupabase.from('transactions').insert(dbTxList).select()

      if (insertedTxs && insertedTxs.length > 0) {
        const { matchTransactionToBill } = await import('@/lib/automation/matching')
        for (const tx of insertedTxs) {
          try {
            await matchTransactionToBill(tx.id)
          } catch (matchErr) {
            console.error('Fuzzy matching failed for transaction:', tx.id, matchErr)
          }
        }
      }
    }

    // Save transaction sync cursor
    await adminSupabase
      .from('financial_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    // 5. Sync liabilities (credit card balances/loans) if any
    try {
      const { creditCards } = await provider.syncLiabilities(accessToken)
      for (const card of creditCards) {
        const internalAccountId = accountIdMap.get(card.accountId)
        if (internalAccountId) {
          await adminSupabase.from('credit_cards').insert({
            account_id: internalAccountId,
            statement_balance: card.statementBalance,
            minimum_payment: card.minimumPayment,
            due_date: card.dueDate,
            statement_closing_date: card.statementClosingDate,
          })
        }
      }
    } catch (e) {
      console.log('No liability/mortgage data parsed or matched for this connection.')
    }

    revalidatePath('/')
    return { success: true, institutionName }
  } catch (error: any) {
    console.error('Error exchanging public token:', error)
    return { error: error.message || 'Failed to complete financial connection' }
  }
}

export async function deleteConnection(connectionId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized user session' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { error: 'Household onboarding required' }
  }

  const adminSupabase = createAdminClient()
  
  try {
    const { data: conn } = await adminSupabase
      .from('financial_connections')
      .select('access_token')
      .eq('id', connectionId)
      .eq('household_id', profile.household_id)
      .single()

    if (conn?.access_token) {
      const provider = getFinancialProvider()
      await provider.disconnectItem(conn.access_token)
    }
  } catch (e) {
    console.log('Unable to disconnect Plaid item remotely - removing from database locally.')
  }

  const { error } = await adminSupabase
    .from('financial_connections')
    .delete()
    .eq('id', connectionId)
    .eq('household_id', profile.household_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

export async function syncConnectionData(connectionId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized user session' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    return { error: 'Household onboarding required' }
  }

  const adminSupabase = createAdminClient()

  const { data: connection, error: connError } = await adminSupabase
    .from('financial_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('household_id', profile.household_id)
    .single()

  if (connError || !connection) {
    return { error: 'Bank connection not found' }
  }

  try {
    const provider = getFinancialProvider()
    const accessToken = connection.access_token

    // 1. Sync accounts
    const providerAccounts = await provider.syncAccounts(accessToken)
    const { data: dbAccounts } = await adminSupabase
      .from('financial_accounts')
      .select('*')
      .eq('connection_id', connection.id)

    const accountIdMap = new Map<string, string>()

    for (const acc of providerAccounts) {
      const matched = dbAccounts?.find((da: any) => da.name === acc.name && da.mask === acc.mask)
      
      let accountId = matched?.id
      if (matched) {
        await adminSupabase
          .from('financial_accounts')
          .update({
            current_balance: acc.currentBalance,
            available_balance: acc.availableBalance,
            credit_limit: acc.creditLimit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', matched.id)
      } else {
        const { data: newAcc } = await adminSupabase
          .from('financial_accounts')
          .insert({
            connection_id: connection.id,
            household_id: profile.household_id,
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
        
        accountId = newAcc?.id
      }

      if (accountId) {
        accountIdMap.set(acc.id, accountId)
      }
    }

    // 2. Sync transactions
    const syncResult = await provider.syncTransactions(accessToken)
    if (syncResult.added.length > 0) {
      const dbTxList = syncResult.added.map((tx) => {
        const internalAccountId = accountIdMap.get(tx.accountId)
        return {
          account_id: internalAccountId!,
          household_id: profile.household_id,
          external_id: tx.id,
          date: tx.date,
          amount: tx.amount,
          description: tx.description,
          normalized_merchant: tx.merchantName,
          category: tx.category,
          subcategory: tx.subcategory,
          pending: tx.pending,
        }
      }).filter((tx) => tx.account_id !== undefined)

      const { data: insertedTxs } = await adminSupabase.from('transactions').insert(dbTxList).select()

      if (insertedTxs && insertedTxs.length > 0) {
        const { matchTransactionToBill } = await import('@/lib/automation/matching')
        for (const tx of insertedTxs) {
          try {
            await matchTransactionToBill(tx.id)
          } catch (matchErr) {
            console.error('Fuzzy matching failed for transaction:', tx.id, matchErr)
          }
        }
      }
    }

    // 3. Sync liabilities
    try {
      const { creditCards } = await provider.syncLiabilities(accessToken)
      for (const card of creditCards) {
        const internalAccountId = accountIdMap.get(card.accountId)
        if (internalAccountId) {
          const { data: existingCard } = await adminSupabase
            .from('credit_cards')
            .select('*')
            .eq('account_id', internalAccountId)
            .single()

          if (existingCard) {
            await adminSupabase
              .from('credit_cards')
              .update({
                statement_balance: card.statementBalance,
                minimum_payment: card.minimumPayment,
                due_date: card.dueDate,
                statement_closing_date: card.statementClosingDate,
              })
              .eq('account_id', internalAccountId)
          } else {
            await adminSupabase.from('credit_cards').insert({
              account_id: internalAccountId,
              statement_balance: card.statementBalance,
              minimum_payment: card.minimumPayment,
              due_date: card.dueDate,
              statement_closing_date: card.statementClosingDate,
            })
          }
        }
      }
    } catch (e) {
      console.log('No liability sync update parsed for this connection.')
    }

    await adminSupabase
      .from('financial_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error syncing connection:', error)
    return { error: error.message || 'Failed to complete data sync' }
  }
}
