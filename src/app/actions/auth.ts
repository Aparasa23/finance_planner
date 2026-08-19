'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const rawEmail = formData.get('email') as string
  const email = rawEmail ? rawEmail.trim().toLowerCase() : ''
  const password = (formData.get('password') as string) || ''
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function signUp(formData: FormData) {
  const rawEmail = formData.get('email') as string
  const email = rawEmail ? rawEmail.trim().toLowerCase() : ''
  const password = (formData.get('password') as string) || ''
  const name = formData.get('name') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0],
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
