'use client'

import React, { useState } from 'react'
import { updateNotificationPreferences } from '@/app/actions/notification'
import { createInvite, joinHousehold } from '@/app/actions/household'
import { PushSubscriptionToggle } from './push-subscription-toggle'
import { Users, Shield, Copy, RefreshCw, Key, Bell, Loader2, Home } from 'lucide-react'

interface SettingsManagerProps {
  profile: any
  household: any
  members: any[]
}

export function SettingsManager({ profile, household, members }: SettingsManagerProps) {
  const [loading, setLoading] = useState<string | null>(null)
  
  // Notification form states
  const prefs = profile.notification_preferences || {
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    redactLockscreenValues: true,
    smsAlertsEnabled: false,
    phoneNumber: '',
  }

  const [quietHours, setQuietHours] = useState(prefs.quietHoursEnabled)
  const [qhStart, setQhStart] = useState(prefs.quietHoursStart)
  const [qhEnd, setQhEnd] = useState(prefs.quietHoursEnd)
  const [redactLock, setRedactLock] = useState(prefs.redactLockscreenValues)
  const [smsAlerts, setSmsAlerts] = useState(prefs.smsAlertsEnabled || false)
  const [phone, setPhone] = useState(prefs.phoneNumber || '')

  // Join household form states
  const [inviteCode, setInviteCode] = useState(household.invite_code || '')
  const [joinCode, setJoinCode] = useState('')

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('preferences')
    
    const result = await updateNotificationPreferences({
      quietHoursEnabled: quietHours,
      quietHoursStart: qhStart,
      quietHoursEnd: qhEnd,
      redactLockscreenValues: redactLock,
      smsAlertsEnabled: smsAlerts,
      phoneNumber: phone,
    })
    
    setLoading(null)
    if (result && result.success) {
      alert('Notification preferences updated successfully!')
    } else if (result && 'error' in result) {
      alert(result.error)
    }
  }

  const handleRegenerateCode = async () => {
    setLoading('regenerate')
    const result = await createInvite()
    setLoading(null)

    if (result && result.inviteCode) {
      setInviteCode(result.inviteCode)
      alert(`New household invite code generated: ${result.inviteCode}`)
    } else if (result && 'error' in result) {
      alert(result.error)
    }
  }

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return

    setLoading('join')
    const result = await joinHousehold(joinCode.trim())
    setLoading(null)

    if (result && result.success) {
      alert('Successfully joined the new household! Reloading page...')
      window.location.reload()
    } else if (result && 'error' in result) {
      alert(result.error)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Panels: Notifications, Alerts, quiet hours */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Web Push Registration toggle wrapper */}
        <PushSubscriptionToggle />

        {/* Quiet Hours & Lockscreen settings form */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-gray-100 flex items-center">
            <Shield className="h-4.5 w-4.5 text-emerald-400 mr-2" /> Alert Controls & Quiet Hours
          </h2>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            
            {/* SMS Alerts Toggle */}
            <div className="flex flex-col space-y-3 p-3 bg-gray-950/20 border border-gray-800/40 rounded-xl">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="smsAlerts"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="rounded border-gray-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                />
                <div className="space-y-0.5">
                  <label htmlFor="smsAlerts" className="text-xs font-semibold text-gray-200 select-none cursor-pointer">
                    Enable SMS due dates & checklist alerts
                  </label>
                  <p className="text-[10px] text-gray-500">
                    Receive direct text messages to your phone number for upcoming card payments, utility deadlines, and audit reviews.
                  </p>
                </div>
              </div>
              {smsAlerts && (
                <div className="space-y-1.5 pl-7 animate-fadeIn">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    Mobile Phone Numbers (separated by commas for multiple devices)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000, +1 (555) 111-2222"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-slate-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 w-full max-w-md focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!phone.trim()) {
                          alert('Please enter at least one phone number to test!')
                          return
                        }
                        const list = phone.split(',').map((n: string) => n.trim()).filter(Boolean)
                        alert(`✔️ Simulation: Direct text alerts sent to: ${JSON.stringify(list)} successfully! Check your console simulator logs.`)
                      }}
                      className="text-[10px] whitespace-nowrap px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold rounded-lg hover:bg-emerald-500 hover:text-slate-950 transition-all cursor-pointer"
                    >
                      Send Test SMS
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lockscreen Redaction Checkbox */}
            <div className="flex items-start space-x-3 p-3 bg-gray-950/20 border border-gray-800/40 rounded-xl">
              <input
                type="checkbox"
                id="redactLock"
                checked={redactLock}
                onChange={(e) => setRedactLock(e.target.checked)}
                className="rounded border-gray-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4 mt-0.5"
              />
              <div className="space-y-0.5">
                <label htmlFor="redactLock" className="text-xs font-semibold text-gray-200 select-none cursor-pointer">
                  Redact lock-screen dollar values
                </label>
                <p className="text-[10px] text-gray-500">
                  When enabled, bank sync summaries visible in push banners replace exact figures with `[Amount]` to protect privacy.
                </p>
              </div>
            </div>

            {/* Quiet Hours Enabled Checkbox */}
            <div className="flex items-start space-x-3 p-3 bg-gray-950/20 border border-gray-800/40 rounded-xl">
              <input
                type="checkbox"
                id="quietHours"
                checked={quietHours}
                onChange={(e) => setQuietHours(e.target.checked)}
                className="rounded border-gray-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4 mt-0.5"
              />
              <div className="space-y-0.5">
                <label htmlFor="quietHours" className="text-xs font-semibold text-gray-200 select-none cursor-pointer">
                  Enable Quiet Hours
                </label>
                <p className="text-[10px] text-gray-500">
                  Automatically silence non-critical budget alerts or large purchase warnings during quiet periods.
                </p>
              </div>
            </div>

            {/* Quiet hours start/end parameters */}
            {quietHours && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-950/10 border border-gray-900/50 rounded-xl animate-fadeIn">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Quiet Period Start</label>
                  <input
                    type="time"
                    value={qhStart}
                    onChange={(e) => setQhStart(e.target.value)}
                    className="bg-slate-900 border border-gray-800/80 rounded-lg px-3 py-1.5 text-xs text-gray-200 w-full focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Quiet Period End</label>
                  <input
                    type="time"
                    value={qhEnd}
                    onChange={(e) => setQhEnd(e.target.value)}
                    className="bg-slate-900 border border-gray-800/80 rounded-lg px-3 py-1.5 text-xs text-gray-200 w-full focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading === 'preferences'}
              className="text-xs px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center space-x-1"
            >
              {loading === 'preferences' ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Save Preferences</span>}
            </button>

          </form>
        </div>

        {/* Household members list */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-gray-100 flex items-center">
            <Users className="h-4.5 w-4.5 text-emerald-400 mr-2" /> Family Members & Partners
          </h2>
          <div className="divide-y divide-gray-800/60">
            {members.map((m) => (
              <div key={m.email} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 text-xs">
                <div>
                  <p className="font-semibold text-gray-200">{m.name || 'Member'}</p>
                  <p className="text-[10px] text-gray-500">{m.email}</p>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-400/80 px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                  {m.role || 'Member'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Column: Family invite keys, household joiner */}
      <div className="space-y-4">
        
        {/* Share code panel */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-100 flex items-center">
              <Home className="h-4.5 w-4.5 text-emerald-400 mr-1.5" /> Share Household
            </h2>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] text-gray-500">
              Provide this unique code to your partner to merge your checkings, savings, and bills dashboards under a unified family overview.
            </p>

            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                readOnly
                value={inviteCode}
                className="bg-slate-950 border border-gray-800/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-300 w-full text-center tracking-wider select-all focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteCode)
                  alert('Invite code copied to clipboard!')
                }}
                className="p-2.5 bg-gray-900 border border-gray-800 text-gray-400 hover:text-emerald-400 rounded-xl transition-colors"
                title="Copy Code"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleRegenerateCode}
              disabled={loading === 'regenerate'}
              className="w-full text-[10px] font-bold text-gray-400 hover:text-emerald-400 flex items-center justify-center space-x-1 py-1 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${loading === 'regenerate' ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Regenerate Invite Code</span>
            </button>
          </div>
        </div>

        {/* Join code form */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-100 flex items-center">
              <Key className="h-4.5 w-4.5 text-emerald-400 mr-1.5" /> Join Household
            </h2>
          </div>

          <form onSubmit={handleJoinHousehold} className="space-y-3">
            <p className="text-[10px] text-gray-500">
              Have an invite code? Paste it below to join your partner's household. 
              <span className="text-rose-400 block mt-1 font-semibold">⚠️ Caution: This will delete your current default empty household and links.</span>
            </p>

            <input
              type="text"
              placeholder="e.g. A1B2C3D4"
              required
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="bg-slate-950 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full text-center focus:outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              disabled={loading === 'join'}
              className="w-full text-xs py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center justify-center"
            >
              {loading === 'join' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Household'}
            </button>
          </form>
        </div>

      </div>

    </div>
  )
}
