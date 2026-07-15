import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'
import { createMockSupabaseClient } from './mock'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes('your-project-id')) {
    return createMockSupabaseClient()
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  ) as any
}

/**
 * Service Role Client for secure operations (webhooks, assistant database tools)
 * that run outside the client's direct query privilege boundaries.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key || url.includes('your-project-id') || key.includes('your-')) {
    return createMockSupabaseClient()
  }

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    }
  ) as any
}
