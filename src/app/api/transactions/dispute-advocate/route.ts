import { NextResponse } from 'next/server'
import { analyzeTransactionDispute } from '@/lib/assistant/gemini'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { merchantName, amount, date, category, disputeReason, userNotes } = body

    if (!merchantName || amount === undefined) {
      return NextResponse.json(
        { error: 'Merchant name and amount are required.' },
        { status: 400 }
      )
    }

    const disputePackage = await analyzeTransactionDispute({
      merchantName: String(merchantName),
      amount: Number(amount),
      date: String(date || new Date().toISOString().split('T')[0]),
      category: String(category || 'General'),
      disputeReason: String(disputeReason || 'Unused subscription refund request'),
      userNotes: userNotes ? String(userNotes) : undefined,
    })

    return NextResponse.json({
      success: true,
      disputePackage,
    })
  } catch (err: any) {
    console.error('Error in dispute advocate route:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate dispute strategy.' },
      { status: 500 }
    )
  }
}
