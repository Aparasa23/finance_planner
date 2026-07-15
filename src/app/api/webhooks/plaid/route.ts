import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { syncHouseholdConnection } from '@/lib/financial/sync'

export async function POST(request: Request) {
  const adminSupabase = createAdminClient()

  let payload: any
  try {
    payload = await request.json()
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  // 1. Log the webhook event in the database for tracking
  const { data: eventLog, error: logError } = await adminSupabase
    .from('webhook_events')
    .insert({
      provider: 'plaid',
      event_type: `${payload.webhook_type || 'UNKNOWN'}_${payload.webhook_code || 'UNKNOWN'}`,
      payload: payload,
      status: 'pending',
    })
    .select()
    .single()

  if (logError || !eventLog) {
    console.error('Failed to log incoming webhook event:', logError)
  }

  const webhookType = payload.webhook_type
  const webhookCode = payload.webhook_code
  const itemId = payload.item_id

  // 2. Identify the connection matching the item_id
  if (!itemId) {
    if (eventLog) {
      await adminSupabase
        .from('webhook_events')
        .update({ status: 'ignored', error_details: 'Missing item_id in payload' })
        .eq('id', eventLog.id)
    }
    return NextResponse.json({ received: true, ignored: true })
  }

  const { data: connection } = await adminSupabase
    .from('financial_connections')
    .select('id')
    .eq('item_id', itemId)
    .single()

  if (!connection) {
    if (eventLog) {
      await adminSupabase
        .from('webhook_events')
        .update({ status: 'ignored', error_details: `No active connection found for item_id: ${itemId}` })
        .eq('id', eventLog.id)
    }
    // Return 200 OK so Plaid does not keep retrying an unmapped sandbox webhook
    return NextResponse.json({ received: true, status: 'unmapped_item_id' })
  }

  // 3. Act based on the Plaid webhook codes
  try {
    if (webhookType === 'TRANSACTIONS') {
      if (webhookCode === 'SYNC_UPDATES_AVAILABLE' || webhookCode === 'INITIAL_UPDATE' || webhookCode === 'DEFAULT_UPDATE') {
        // Run sync asynchronously so we reply to Plaid immediately (Plaid webhooks expect quick responses)
        // Next.js 'after' function or simple async invocation is ideal.
        // We'll run it in the background
        syncHouseholdConnection(connection.id).then((result) => {
          adminSupabase
            .from('webhook_events')
            .update({
              status: result.success ? 'processed' : 'failed',
              processed_at: new Date().toISOString(),
              error_details: result.error || null,
            })
            .eq('id', eventLog.id)
            .then()
        })
      } else {
        await adminSupabase
          .from('webhook_events')
          .update({ status: 'ignored', error_details: `Unhandled transaction code: ${webhookCode}` })
          .eq('id', eventLog.id)
      }
    } else if (webhookType === 'ITEM') {
      if (webhookCode === 'ERROR') {
        // Mark item as requiring reconnection
        await adminSupabase
          .from('financial_connections')
          .update({
            status: 'reconnect_required',
            error_code: payload.error?.error_code || 'ITEM_LOGIN_REQUIRED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id)

        await adminSupabase
          .from('webhook_events')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString(),
            error_details: 'Item login required error handled',
          })
          .eq('id', eventLog.id)
      } else {
        await adminSupabase
          .from('webhook_events')
          .update({ status: 'ignored', error_details: `Unhandled item code: ${webhookCode}` })
          .eq('id', eventLog.id)
      }
    } else {
      await adminSupabase
        .from('webhook_events')
        .update({ status: 'ignored', error_details: `Unhandled webhook type: ${webhookType}` })
        .eq('id', eventLog.id)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook execution failed:', error)
    if (eventLog) {
      await adminSupabase
        .from('webhook_events')
        .update({
          status: 'failed',
          error_details: error.message || 'Fatal webhook error',
        })
        .eq('id', eventLog.id)
    }
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
