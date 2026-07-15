import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsManager } from '@/components/settings-manager'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Query user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, household:households(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    redirect('/register')
  }

  // Get list of household members
  const { data: members = [] } = await supabase
    .from('profiles')
    .select('name, email, role')
    .eq('household_id', profile.household_id)

  const household = profile.household as any

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-100">Household Settings</h1>
        <p className="text-xs text-gray-400">Configure quiet hours, lockscreen redactions, device push alerts, and manage family sharing invite codes.</p>
      </div>

      <SettingsManager
        profile={profile}
        household={household || { name: 'Household', invite_code: 'MOCKCODE' }}
        members={members || []}
      />
    </div>
  )
}
