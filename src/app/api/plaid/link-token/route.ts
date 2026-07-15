import { NextResponse } from 'next/server'
import { getPlaidLinkToken } from '@/app/actions/plaid'

export const dynamic = 'force-dynamic'

export async function POST() {
  const result = await getPlaidLinkToken()
  if (result && 'error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json(result)
}
