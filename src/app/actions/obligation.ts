'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateAmortizationSchedule } from '@/lib/installment/amortization'

export async function createManualAccount(formData: {
  name: string
  type: 'manual_asset' | 'manual_liability' | 'depository' | 'credit' | 'loan' | 'investment'
  subtype: string
  balance: number
}) {
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
    const adminSupabase = createAdminClient()
    const { data: account, error } = await adminSupabase
      .from('financial_accounts')
      .insert({
        household_id: profile.household_id,
        connection_id: null, // manual ledger
        name: formData.name,
        type: formData.type,
        subtype: formData.subtype,
        current_balance: formData.balance,
        available_balance: formData.balance,
        mask: 'MANL',
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/')
    return { success: true, accountId: account.id }
  } catch (err: any) {
    console.error('Error creating manual account:', err)
    return { error: err.message || 'Failed to create manual account' }
  }
}

export async function createManualBill(formData: {
  name: string
  expectedAmount: number
  isFixed: boolean
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
  dueDateDay: number
  autopay: boolean
}) {
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
    const adminSupabase = createAdminClient()

    // 1. Insert base bill
    const { data: bill, error: billError } = await adminSupabase
      .from('bills')
      .insert({
        household_id: profile.household_id,
        name: formData.name,
        expected_amount: formData.expectedAmount,
        is_fixed: formData.isFixed,
        frequency: formData.frequency,
        due_date_day: formData.dueDateDay,
        autopay: formData.autopay,
        active: true,
      })
      .select()
      .single()

    if (billError || !bill) throw billError

    // 2. Generate the next 3 scheduled occurrences
    const today = new Date()
    const occurrences: any[] = []

    for (let i = 0; i < 3; i++) {
      let dueDate = new Date(today.getFullYear(), today.getMonth() + i, formData.dueDateDay)
      
      // If the calculated date is in the past, push forward by a month
      if (i === 0 && dueDate.getTime() < today.getTime()) {
        dueDate = new Date(today.getFullYear(), today.getMonth() + 1, formData.dueDateDay)
      }

      occurrences.push({
        household_id: profile.household_id,
        bill_id: bill.id,
        due_date: dueDate.toISOString().split('T')[0],
        expected_amount: formData.expectedAmount,
        status: 'upcoming',
      })
    }

    const { error: occError } = await adminSupabase
      .from('bill_occurrences')
      .insert(occurrences)

    if (occError) throw occError

    revalidatePath('/')
    return { success: true, billId: bill.id }
  } catch (err: any) {
    console.error('Error creating manual bill:', err)
    return { error: err.message || 'Failed to record bill' }
  }
}

export async function createInstallmentPlan(formData: {
  name: string
  provider: string
  purchaseAmount: number
  interestRate: number // APR e.g. 15 for 15%
  termMonths: number
  startDate: string
  autopay: boolean
}) {
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
    const adminSupabase = createAdminClient()

    // 1. Calculate the Amortization Schedule
    const rate = formData.interestRate / 100 // convert percent to decimal
    const scheduleResult = calculateAmortizationSchedule(
      formData.purchaseAmount,
      rate,
      formData.termMonths,
      formData.startDate
    )

    // Compute dynamic parameters relative to today's date
    const start = new Date(formData.startDate + 'T12:00:00')
    const today = new Date()
    
    let monthsPassed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth())
    if (today.getDate() < start.getDate()) {
      monthsPassed = Math.max(0, monthsPassed - 1)
    }

    const paymentsCompleted = Math.min(formData.termMonths, Math.max(0, monthsPassed))
    const paymentsRemaining = formData.termMonths - paymentsCompleted

    let remainingPrincipal = formData.purchaseAmount
    if (paymentsCompleted > 0) {
      const lastPayment = scheduleResult.schedule[paymentsCompleted - 1]
      if (lastPayment) {
        remainingPrincipal = Number(lastPayment.remainingPrincipal)
      }
    }

    const nextDue = new Date(start)
    nextDue.setMonth(start.getMonth() + paymentsCompleted + 1)
    const nextDueDateString = paymentsRemaining > 0 ? nextDue.toISOString().split('T')[0] : null

    // 2. Create a manual liability account to track remaining principal
    const { data: account, error: accError } = await adminSupabase
      .from('financial_accounts')
      .insert({
        household_id: householdId,
        connection_id: null,
        name: `${formData.provider} - ${formData.name}`,
        type: 'loan',
        subtype: 'installment',
        current_balance: remainingPrincipal, // outstanding liability
        available_balance: 0,
        mask: 'BNPL',
      })
      .select()
      .single()

    if (accError || !account) throw accError

    // 3. Create a linked Bill stream for occurrences matching the payments
    const firstDueDate = new Date(scheduleResult.schedule[0].dueDate)
    const dueDay = firstDueDate.getDate()

    const { data: bill, error: billError } = await adminSupabase
      .from('bills')
      .insert({
        household_id: householdId,
        name: `${formData.provider} Payment - ${formData.name}`,
        category: 'Loans',
        expected_amount: scheduleResult.monthlyPayment,
        is_fixed: rate === 0, // fixed monthly amount
        frequency: 'monthly',
        due_date_day: dueDay,
        autopay: formData.autopay,
        start_date: formData.startDate,
        active: true,
      })
      .select()
      .single()

    if (billError || !bill) throw billError

    // 4. Create the Installment Plan entry
    const finalPayment = scheduleResult.schedule[scheduleResult.schedule.length - 1]
    const { data: plan, error: planError } = await adminSupabase
      .from('installment_plans')
      .insert({
        household_id: householdId,
        account_id: account.id,
        name: formData.name,
        provider: formData.provider,
        original_purchase_amount: formData.purchaseAmount,
        down_payment: 0,
        financed_principal: formData.purchaseAmount,
        interest_rate: rate,
        apr: formData.interestRate,
        fees: 0,
        regular_payment_amount: scheduleResult.monthlyPayment,
        payment_frequency: 'monthly',
        total_scheduled_payments: formData.termMonths,
        payments_completed: paymentsCompleted,
        payments_remaining: paymentsRemaining,
        total_amount_paid: paymentsCompleted * scheduleResult.monthlyPayment,
        principal_paid: formData.purchaseAmount - remainingPrincipal,
        interest_paid: (paymentsCompleted * scheduleResult.monthlyPayment) - (formData.purchaseAmount - remainingPrincipal),
        remaining_principal: remainingPrincipal,
        current_payoff_amount: remainingPrincipal,
        start_date: formData.startDate,
        autopay: formData.autopay,
        expected_payoff_date: finalPayment.dueDate,
        next_due_date: nextDueDateString,
      })
      .select()
      .single()

    if (planError || !plan) throw planError

    // 5. Pre-generate all bill occurrences matching the amortization periods
    const dbOccurrences = scheduleResult.schedule.map((p) => {
      const isPast = new Date(p.dueDate + 'T23:59:59') < today
      return {
        bill_id: bill.id,
        due_date: p.dueDate,
        expected_amount: p.paymentAmount,
        status: isPast ? 'paid' : 'upcoming',
      }
    })

    const { error: occurrencesError } = await adminSupabase
      .from('bill_occurrences')
      .insert(dbOccurrences)

    if (occurrencesError) throw occurrencesError

    revalidatePath('/')
    return { success: true, planId: plan.id }
  } catch (err: any) {
    console.error('Error creating installment plan:', err)
    return { error: err.message || 'Failed to establish installment plan ledger' }
  }
}

export async function deleteInstallmentPlan(planId: string) {
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
    const { data: plan } = await adminSupabase
      .from('installment_plans')
      .select('account_id, name, provider')
      .eq('id', planId)
      .eq('household_id', profile.household_id)
      .single()

    if (plan) {
      const billName = `${plan.provider} Payment - ${plan.name}`
      await adminSupabase
        .from('bills')
        .delete()
        .eq('household_id', profile.household_id)
        .eq('name', billName)

      if (plan.account_id) {
        await adminSupabase
          .from('financial_accounts')
          .delete()
          .eq('id', plan.account_id)
          .eq('household_id', profile.household_id)
      }

      await adminSupabase
        .from('installment_plans')
        .delete()
        .eq('id', planId)
        .eq('household_id', profile.household_id)
    }

    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting installment plan:', error)
    return { error: error.message || 'Failed to delete installment plan' }
  }
}

export async function deleteManualAccount(accountId: string) {
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
    await adminSupabase
      .from('financial_accounts')
      .delete()
      .eq('id', accountId)
      .eq('household_id', profile.household_id)

    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting manual account:', error)
    return { error: error.message || 'Failed to delete manual account' }
  }
}

export async function confirmOccurrencePayment(occurrenceId: string) {
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
    // 1. Fetch occurrence details to verify household ownership
    const { data: occ, error: fetchErr } = await adminSupabase
      .from('bill_occurrences')
      .select('*, bill:bills(*)')
      .eq('id', occurrenceId)
      .single()

    if (fetchErr || !occ || occ.bill?.household_id !== profile.household_id) {
      return { error: 'Occurrence not found' }
    }

    // 2. Update status to 'paid'
    const { error: updateErr } = await adminSupabase
      .from('bill_occurrences')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', occurrenceId)

    if (updateErr) throw updateErr

    // 3. Increment amortization counts if linked to a plan
    const { data: plan } = await adminSupabase
      .from('installment_plans')
      .select('*')
      .eq('household_id', profile.household_id)
      .eq('bill_id', occ.bill_id)
      .single()

    if (plan) {
      const completed = Number(plan.payments_completed) + 1
      const scheduled = Number(plan.total_scheduled_payments)
      const remaining = Math.max(0, scheduled - completed)
      
      const rate = Number(plan.interest_rate)
      const monthlyPayment = Number(plan.regular_payment_amount)
      let bal = Number(plan.original_purchase_amount || plan.financed_principal)
      
      for (let i = 0; i < completed; i++) {
        const interest = bal * (rate / 12)
        const principal = monthlyPayment - interest
        bal = Math.max(0, bal - principal)
      }

      await adminSupabase
        .from('installment_plans')
        .update({
          payments_completed: completed,
          payments_remaining: remaining,
          remaining_principal: Number(bal.toFixed(2)),
          current_payoff_amount: Number(bal.toFixed(2)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan.id)
    }

    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Error confirming occurrence payment:', err)
    return { error: err.message || 'Failed to update occurrence status' }
  }
}

