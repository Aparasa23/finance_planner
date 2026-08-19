'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as Record<string, unknown>).digest === 'string' &&
    ((error as Record<string, unknown>).digest as string).startsWith('NEXT_REDIRECT')
  )
}

/**
 * Authenticates user credentials against Supabase Auth.
 */
export async function login(formData: FormData) {
  try {
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
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    console.error('Login action error:', err)
    return {
      error:
        err instanceof Error && err.message.includes('fetch failed')
          ? 'Unable to connect to Supabase database. Please ensure environment variables are configured on Vercel.'
          : err instanceof Error
          ? err.message
          : 'Authentication failed',
    }
  }
}

export async function signUp(formData: FormData) {
  try {
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
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    console.error('SignUp action error:', err)
    return {
      error: err instanceof Error ? err.message : 'Registration failed',
    }
  }
}

export async function signOut() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err
    redirect('/login')
  }
}
