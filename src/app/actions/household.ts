'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper to generate a random 8-character alphanumeric invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function getHousehold() {
  const supabase = await createClient()

  // Get current user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id, role')
    .single()

  if (profileError || !profile?.household_id) {
    return { error: 'Profile or household not found' }
  }

  // Get household info
  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('*')
    .eq('id', profile.household_id)
    .single()

  if (householdError || !household) {
    return { error: 'Household details not found' }
  }

  // Get all members of the household
  const { data: members, error: membersError } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('household_id', profile.household_id)

  if (membersError) {
    return { error: 'Could not fetch household members' }
  }

  return {
    household,
    members,
    currentUserRole: profile.role,
  }
}

export async function updateHouseholdName(name: string) {
  const supabase = await createClient()

  // Get user profile to verify they are owner
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id, role')
    .single()

  if (profileError || !profile?.household_id) {
    return { error: 'Profile not found' }
  }

  if (profile.role !== 'owner') {
    return { error: 'Only household owners can update the household name' }
  }

  const { error: updateError } = await supabase
    .from('households')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', profile.household_id)

  if (updateError) {
    return { error: 'Failed to update household name' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function createInvite() {
  const supabase = await createClient()

  // Verify ownership
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id, role')
    .single()

  if (profileError || !profile?.household_id) {
    return { error: 'Profile not found' }
  }

  if (profile.role !== 'owner') {
    return { error: 'Only household owners can invite members' }
  }

  const inviteCode = generateInviteCode()
  const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 Hours

  const { error: updateError } = await supabase
    .from('households')
    .update({
      invite_code: inviteCode,
      invite_expires_at: inviteExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.household_id)

  if (updateError) {
    return { error: 'Could not generate invite code' }
  }

  revalidatePath('/settings')
  return { inviteCode, inviteExpiresAt }
}

export async function joinHousehold(inviteCode: string) {
  const supabase = await createClient()

  // Get current user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, household_id, role')
    .single()

  if (profileError || !profile) {
    return { error: 'Profile not found' }
  }

  const oldHouseholdId = profile.household_id

  // Find the target household matching the active invite code
  const { data: targetHousehold, error: targetError } = await supabase
    .from('households')
    .select('id, invite_expires_at')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single()

  if (targetError || !targetHousehold) {
    return { error: 'Invalid invite code' }
  }

  // Check expiration
  if (targetHousehold.invite_expires_at && new Date(targetHousehold.invite_expires_at) < new Date()) {
    return { error: 'This invite code has expired' }
  }

  if (targetHousehold.id === oldHouseholdId) {
    return { error: 'You are already a member of this household' }
  }

  // Join target household as a member
  const { error: joinError } = await supabase
    .from('profiles')
    .update({
      household_id: targetHousehold.id,
      role: 'member',
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  if (joinError) {
    return { error: 'Failed to join the new household' }
  }

  // Optional: Clean up old household if the user was the sole owner and it has no connections
  if (oldHouseholdId) {
    const { data: otherMembers } = await supabase
      .from('profiles')
      .select('id')
      .eq('household_id', oldHouseholdId)
      .neq('id', profile.id)

    const { data: connections } = await supabase
      .from('financial_connections')
      .select('id')
      .eq('household_id', oldHouseholdId)

    if ((!otherMembers || otherMembers.length === 0) && (!connections || connections.length === 0)) {
      // Safe to delete empty household
      await supabase.from('households').delete().eq('id', oldHouseholdId)
    }
  }

  revalidatePath('/')
  return { success: true }
}
