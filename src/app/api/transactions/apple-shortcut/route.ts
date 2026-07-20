import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { matchTransactionToBill, checkForPotentialSubscription } from '@/lib/automation/matching'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, merchant, date, secret } = body

    // 1. Verify security secret
    if (!secret || secret !== process.env.SHORTCUT_SECRET) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (!amount || !merchant) {
      return NextResponse.json({ error: 'Missing required transaction fields' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 2. Locate or auto-create a manual Apple Card account
    const { data: household, error: houseErr } = await adminSupabase
      .from('profiles')
      .select('household_id')
      .limit(1)
      .single()

    if (houseErr || !household?.household_id) {
      return NextResponse.json({ error: 'No active household onboarding found' }, { status: 400 })
    }

    const householdId = household.household_id

    // Find the Apple Card manual account
    let { data: appleAccount } = await adminSupabase
      .from('financial_accounts')
      .select('id')
      .eq('household_id', householdId)
      .eq('name', 'Apple Card')
      .single()

    // If it doesn't exist, create it as a manual credit card liability account
    if (!appleAccount) {
      const { data: newAccount, error: createAccErr } = await adminSupabase
        .from('financial_accounts')
        .insert({
          household_id: householdId,
          name: 'Apple Card',
          type: 'credit',
          subtype: 'credit card',
          current_balance: 0,
        })
        .select()
        .single()

      if (createAccErr || !newAccount) {
        throw new Error('Failed to auto-provision Apple Card account ledger')
      }
      appleAccount = newAccount
    }

    // 3. Format amount
    const txAmount = parseFloat(amount)

    // 4. Insert transaction
    const { data: transaction, error: txErr } = await adminSupabase
      .from('transactions')
      .insert({
        account_id: appleAccount.id,
        household_id: householdId,
        date: date || new Date().toISOString().split('T')[0],
        amount: txAmount,
        description: merchant,
        normalized_merchant: merchant,
        category: 'Credit Card Payment',
        pending: false,
      })
      .select()
      .single()

    if (txErr || !transaction) {
      throw new Error(`Failed to log Apple Card transaction: ${txErr?.message}`)
    }

    // 5. Trigger the automatic fuzzy bill matcher and subscription classifier
    const matchRes = await matchTransactionToBill(transaction.id)
    if (matchRes && !matchRes.matched) {
      await checkForPotentialSubscription(transaction.id)
    }

    // 6. Update Apple Card current balance ledger by adding the transaction amount
    const { data: currentAcc } = await adminSupabase
      .from('financial_accounts')
      .select('current_balance')
      .eq('id', appleAccount.id)
      .single()

    if (currentAcc) {
      const newBal = (currentAcc.current_balance || 0) + txAmount
      await adminSupabase
        .from('financial_accounts')
        .update({ current_balance: newBal })
        .eq('id', appleAccount.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Apple Card transaction synchronized and processed.',
      transactionId: transaction.id,
      matchedBill: matchRes?.matched || false
    })

  } catch (err: any) {
    console.error('Apple Card shortcut sync error:', err)
    return NextResponse.json({ error: err.message || 'Internal process failed' }, { status: 500 })
  }
}
