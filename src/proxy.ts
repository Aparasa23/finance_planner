import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip middleware for static assets, public icons, manifest, service worker, and webhooks
  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/api/webhooks')
  ) {
    return supabaseResponse
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let user: any = null

  if (!url || !key || url.includes('your-project-id')) {
    const { createMockSupabaseClient } = require('@/lib/supabase/mock')
    const mockSupabase = createMockSupabaseClient()
    const session = await mockSupabase.auth.getUser()
    user = session.data?.user || null
  } else {
    const supabase = createServerClient<Database>(
      url,
      key,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    const session = await supabase.auth.getUser()
    user = session.data?.user || null
  }

  // Define protected pages
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isPublicPage = isAuthPage || pathname.startsWith('/api/') || pathname === '/offline'

  // If not authenticated and trying to view dashboard/accounts/bills etc, redirect to login
  if (!user && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If authenticated and trying to view login/register, redirect to dashboard root
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
