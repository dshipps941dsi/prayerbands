import { NextRequest, NextResponse } from 'next/server'
import { isInternalOrAdmin } from '@/lib/internal-auth'
import { sendShippingConfirmation } from '@/lib/shipping-email'

// Public-facing endpoint (admin browser session or internal secret) that sends
// the shipping-confirmation email. The email itself lives in lib/shipping-email
// so trusted server routes (e.g. the fulfillment ship endpoint) can send it
// directly without going through this auth gate.
export async function POST(req: NextRequest) {
  if (!(await isInternalOrAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orderId, customerEmail, customerName, bandIds, trackingNumber } = await req.json().catch(() => ({}))
  const res = await sendShippingConfirmation({ orderId, customerEmail, customerName, bandIds, trackingNumber })
  if (!res.ok) return NextResponse.json({ error: res.error || 'Failed to send email' }, { status: 500 })
  return NextResponse.json({ success: true })
}
