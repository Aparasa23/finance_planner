'use client'

import React, { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, Check } from 'lucide-react'
import { savePushSubscription } from '@/app/actions/notification'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushSubscriptionToggle() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const subscribeDevice = async () => {
    if (!supported) return
    setLoading(true)

    try {
      // 1. Request permission
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setLoading(false)
        return
      }

      // 2. Fetch service worker registration
      const registration = await navigator.serviceWorker.ready
      
      // 3. Generate or retrieve subscription
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFZ79hY2kG_gG-8-2-yWj8Z-yG10714-TEST-KEY_NOT-SET'
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      // Convert credentials to string buffers
      const p256dh = subscription.getKey('p256dh')
      const auth = subscription.getKey('auth')

      const p256dhBase64 = p256dh ? btoa(String.fromCharCode(...new Uint8Array(p256dh))) : ''
      const authBase64 = auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : ''

      // 4. Save subscription to server database
      const saveResult = await savePushSubscription({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: p256dhBase64,
          auth: authBase64,
        },
        userAgent: navigator.userAgent,
      })

      if (saveResult && 'error' in saveResult) {
        alert(saveResult.error)
      }
    } catch (err) {
      console.error('Push registration subscription failed:', err)
      alert('Could not configure push notifications on this device. Verify VAPID environment variables.')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between text-xs text-gray-500">
        <span>Push notifications are not supported on this browser/app shell.</span>
        <BellOff className="h-4 w-4 text-gray-600" />
      </div>
    )
  }

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider flex items-center">
          <Bell className="h-4 w-4 mr-1.5 text-emerald-400" /> Push Alerts (Device Link)
        </h3>
        <p className="text-[10px] text-gray-400">
          {permission === 'granted'
            ? 'This device is currently authorized to receive real-time cash notifications.'
            : 'Authorize push notifications on this device to receive alerts on due bills.'}
        </p>
      </div>

      <button
        onClick={subscribeDevice}
        disabled={loading || permission === 'granted'}
        className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all inline-flex items-center space-x-1 justify-center shrink-0 min-w-[120px] ${
          permission === 'granted'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
        }`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : permission === 'granted' ? (
          <>
            <Check className="h-3.5 w-3.5" />
            <span>Connected</span>
          </>
        ) : (
          <span>Enable Alerts</span>
        )}
      </button>
    </div>
  )
}
