import { NextResponse } from 'next/server'
import { exchangePlaidPublicToken } from '@/app/actions/plaid'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  const { publicToken } = body

  if (!publicToken) {
    return NextResponse.json({ error: 'Missing publicToken parameter' }, { status: 400 })
  }

  const result = await exchangePlaidPublicToken(publicToken)
  if (result && 'error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
