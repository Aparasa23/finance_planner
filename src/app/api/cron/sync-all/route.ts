import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { syncHouseholdConnection } from '@/lib/financial/sync'

async function handleSyncAll(request: Request) {
  // Verify Vercel Cron header or authorization header if CRON_SECRET is set
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()

  // Fetch all active financial connections
  const { data: connections, error } = await adminSupabase
    .from('financial_connections')
    .select('id, household_id, provider')
    .eq('status', 'active')

  if (error || !connections) {
    console.error('Cron job error fetching connections:', error)
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }

  const results = []
  for (const conn of connections) {
    try {
      const res = await syncHouseholdConnection(conn.id)
      results.push({ id: conn.id, success: res.success, error: res.error })
    } catch (err: any) {
      results.push({ id: conn.id, success: false, error: err.message })
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalSynced: results.length,
    results,
  })
}

export async function GET(request: Request) {
  return handleSyncAll(request)
}

export async function POST(request: Request) {
  return handleSyncAll(request)
}
