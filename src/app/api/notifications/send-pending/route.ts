import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

// Set VAPID keys configuration safely
const initWebPush = () => {
  const mailSubject = 'mailto:household@financeos.local'
  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const privKey = process.env.VAPID_PRIVATE_KEY || ''

  if (pubKey && privKey && pubKey !== 'your-vapid-public-key') {
    try {
      webpush.setVapidDetails(mailSubject, pubKey, privKey)
      return true
    } catch (err) {
      console.error('Error initializing web-push keys:', err)
    }
  }
  return false
}

export async function POST() {
  const isPushEnabled = initWebPush()
  const adminSupabase = createAdminClient()

  // 1. Fetch pending notifications
  const { data: pendingNotifications = [] } = await adminSupabase
    .from('notifications')
    .select('*, profiles:profiles(id, notification_preferences, timezone)')
    .eq('status', 'pending_delivery')

  if (!pendingNotifications || pendingNotifications.length === 0) {
    return NextResponse.json({ success: true, message: 'No pending notifications' })
  }

  let sentCount = 0
  let failedCount = 0

  for (const notification of pendingNotifications) {
    const householdId = notification.household_id
    
    // 2. Fetch active browser subscriptions for this household
    const { data: subscriptions = [] } = await adminSupabase
      .from('push_subscriptions')
      .select('*')
      .eq('household_id', householdId)

    if (!subscriptions || subscriptions.length === 0) {
      // Mark as delivered/undeliverable to clean queue
      await adminSupabase
        .from('notifications')
        .update({ status: 'delivery_failed', updated_at: new Date().toISOString() })
        .eq('id', notification.id)
      continue
    }

    // 3. Evaluate Quiet Hours & Redaction Settings
    // Default preferences: quietHours default 10 PM - 8 AM, lockscreen redaction active
    const userPrefs = notification.profiles?.notification_preferences || {
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      redactLockscreenValues: true,
    }

    const timezone = notification.profiles?.timezone || 'UTC'
    
    // Check if current hour falls inside user's quiet hours
    let isQuietHours = false
    if (userPrefs.quietHoursEnabled) {
      try {
        // Simple local hour conversion based on profile timezone
        const localTimeStr = new Date().toLocaleTimeString('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          hour12: false,
        })
        const currentHour = parseInt(localTimeStr)
        const startHour = parseInt(userPrefs.quietHoursStart.split(':')[0])
        const endHour = parseInt(userPrefs.quietHoursEnd.split(':')[0])

        if (startHour > endHour) {
          isQuietHours = currentHour >= startHour || currentHour < endHour
        } else {
          isQuietHours = currentHour >= startHour && currentHour < endHour
        }
      } catch (e) {
        // Fallback to local machine timezone check
        const currentHour = new Date().getHours()
        isQuietHours = currentHour >= 22 || currentHour < 8
      }
    }

    let title = notification.title
    let message = notification.message
    let isSilent = false

    // Redact numerical values if lockscreen redaction is active or during quiet hours
    if (userPrefs.redactLockscreenValues || isQuietHours) {
      // Regex matches currency e.g., $150.00 or $5,000
      const amountRegex = /\$\d+(?:,\d{3})*(?:\.\d{2})?/g
      message = message.replace(amountRegex, '[Amount]')
    }

    if (isQuietHours) {
      // Send as silent/low priority banner during quiet hours
      isSilent = true
      title = `[Quiet Mode] ${title}`
    }

    const payload = JSON.stringify({
      title: title,
      body: message,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      silent: isSilent,
      data: {
        url: notification.notification_type?.includes('bill') ? '/calendar' : '/',
      },
    })

    // 4. Send to all registered devices of the household
    let messageDelivered = false

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.subscription_endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key,
        },
      }

      if (isPushEnabled) {
        try {
          await webpush.sendNotification(pushSubscription, payload)
          messageDelivered = true
        } catch (err: any) {
          console.error(`Web Push delivery failed for subscription ID: ${sub.id}`, err)
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Delete expired/invalid device registration (Gone or Not Found)
            await adminSupabase.from('push_subscriptions').delete().eq('id', sub.id)
            console.log(`Cleaned up stale subscription endpoint ID: ${sub.id}`)
          }
        }
      } else {
        // Local simulation log: print formatted alert in console
        console.log(`[Push Notification Simulation]
          To: Household ${householdId} (Device UserAgent: ${sub.device_info?.userAgent})
          Title: ${title}
          Body: ${message}
          Silent: ${isSilent}
        `)
        messageDelivered = true
      }
    }

    // 5. Update notification queue status
    await adminSupabase
      .from('notifications')
      .update({
        status: messageDelivered ? 'unread' : 'delivery_failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', notification.id)

    if (messageDelivered) {
      sentCount++
    } else {
      failedCount++
    }
  }

  return NextResponse.json({
    success: true,
    sent: sentCount,
    failed: failedCount,
  })
}
