'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function savePushSubscription(subscription: {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
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

    // 1. Check if this subscription endpoint already exists
    const { data: existing } = await adminSupabase
      .from('push_subscriptions')
      .select('id')
      .eq('subscription_endpoint', subscription.endpoint)
      .single()

    const subData = {
      profile_id: user.id,
      household_id: profile.household_id,
      subscription_endpoint: subscription.endpoint,
      p256dh_key: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      device_info: {
        userAgent: subscription.userAgent || 'Unknown Device',
        registeredAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      await adminSupabase
        .from('push_subscriptions')
        .update(subData)
        .eq('id', existing.id)
    } else {
      await adminSupabase
        .from('push_subscriptions')
        .insert({
          ...subData,
          created_at: new Date().toISOString(),
        })
    }

    return { success: true }
  } catch (err: any) {
    console.error('Error saving push subscription:', err)
    return { error: err.message || 'Failed to record device subscription' }
  }
}

export async function updateNotificationPreferences(preferences: {
  quietHoursEnabled: boolean
  quietHoursStart: string // e.g. "22:00"
  quietHoursEnd: string // e.g. "08:00"
  redactLockscreenValues: boolean
  smsAlertsEnabled: boolean
  phoneNumber: string
}) {
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
    
    const { error } = await adminSupabase
      .from('profiles')
      .update({
        notification_preferences: preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) throw error

    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Error updating preferences:', err)
    return { error: err.message || 'Failed to update preferences' }
  }
}
