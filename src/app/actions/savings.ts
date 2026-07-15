'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function logSavingsContribution(goalId: string, amount: number) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized user session' }
  }

  try {
    const adminSupabase = createAdminClient()

    // 1. Fetch current goal state
    const { data: goal, error: fetchError } = await adminSupabase
      .from('savings_goals')
      .select('*')
      .eq('id', goalId)
      .single()

    if (fetchError || !goal) throw fetchError

    const currentAmount = Number(goal.current_amount) + amount
    const targetAmount = Number(goal.target_amount)

    // Calculate revised status
    let status = goal.on_track_status
    if (currentAmount >= targetAmount) {
      status = 'completed'
    }

    // 2. Update goal
    const { error: updateError } = await adminSupabase
      .from('savings_goals')
      .update({
        current_amount: Number(currentAmount.toFixed(2)),
        on_track_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)

    if (updateError) throw updateError

    revalidatePath('/savings')
    return { success: true }
  } catch (err: any) {
    console.error('Error logging savings contribution:', err)
    return { error: err.message || 'Failed to update savings goal' }
  }
}

export async function createSavingsGoal(formData: {
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  monthlyContribution: number
  priority: number
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
    const { error } = await adminSupabase
      .from('savings_goals')
      .insert({
        household_id: profile.household_id,
        name: formData.name,
        target_amount: formData.targetAmount,
        current_amount: formData.currentAmount,
        target_date: formData.targetDate || null,
        monthly_target_contribution: formData.monthlyContribution || 0,
        priority: formData.priority,
        on_track_status: formData.currentAmount >= formData.targetAmount ? 'completed' : 'on_track',
      })

    if (error) throw error

    revalidatePath('/savings')
    return { success: true }
  } catch (err: any) {
    console.error('Error creating savings goal:', err)
    return { error: err.message || 'Failed to record savings goal' }
  }
}
