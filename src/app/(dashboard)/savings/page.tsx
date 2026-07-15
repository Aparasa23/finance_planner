import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SavingsManager } from '@/components/savings-manager'

export default async function SavingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    redirect('/register')
  }

  // Fetch savings goals
  const { data: goals = [] } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('household_id', profile.household_id)
    .order('priority', { ascending: true })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-100">Savings Goals</h1>
        <p className="text-xs text-gray-400">Track and prioritize household savings targets and timeline estimates.</p>
      </div>

      <SavingsManager initialGoals={goals || []} />
    </div>
  )
}
