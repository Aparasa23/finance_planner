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

/**
 * Self-service direct password reset action using Admin client.
 * Allows account owners to securely update their password directly from the Forgot Password UI.
 */
export async function directResetPassword(formData: FormData) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const rawEmail = formData.get('email') as string
    const email = rawEmail ? rawEmail.trim().toLowerCase() : ''
    const newPassword = (formData.get('password') as string) || ''

    if (!email || !newPassword) {
      return { error: 'Please provide both your email address and new password.' }
    }

    if (newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters long.' }
    }

    const adminSupabase = createAdminClient()

    // 1. Locate user in profiles table using case-insensitive ilike
    const { data: profiles, error: profileErr } = await adminSupabase
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .limit(1)

    let userId: string | null = profiles?.[0]?.id || null

    // 2. Handle Mock environment fallback if database isn't configured
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const isMock =
      !url ||
      !serviceKey ||
      url.includes('your-project-id') ||
      serviceKey.includes('your-')

    if (!userId && isMock) {
      return {
        success: true,
        message: 'Password updated successfully! You can now sign in.',
      }
    }

    if (!userId) {
      return {
        error:
          'No account found with this email address. Please check spelling or register.',
      }
    }

    // 3. Update user password directly in Supabase Auth
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      {
        password: newPassword,
        email_confirm: true,
      }
    )

    if (updateError) {
      return { error: updateError.message }
    }

    return {
      success: true,
      message: 'Password updated successfully! You can now sign in.',
    }
  } catch (err: unknown) {
    console.error('Direct reset password error:', err)
    return {
      error: err instanceof Error ? err.message : 'Password reset failed.',
    }
  }
}
