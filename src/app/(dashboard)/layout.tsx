import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavigationShell } from '@/components/navigation-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Verify authentication server-side
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Retrieve user profiles detail for layout
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .single()

  return (
    <NavigationShell
      userEmail={user.email}
      userName={profile?.name || user.email?.split('@')[0] || 'Household Member'}
    >
      {children}
    </NavigationShell>
  )
}
