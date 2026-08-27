import { NextRequest, NextResponse } from 'next/server'
import { isTeamMember } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildLabelSheet, buildCalibrationSheet, LABELS_PER_SHEET, type SheetLabel } from '@/lib/label-sheet'

// TODO(stage 2): replace with a profiles.role check so packers can print without
// being the owner's Google account.
const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamMember(user)
}

// POST /api/admin/label-sheet { orderIds: number[], startAt?: number }
// Returns an Avery 5160 PDF of the shipping addresses for those orders.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // An alignment sheet needs no orders — it exists precisely for when there are
  // none yet and the printer is still unproven.
  if (body?.calibration === true) {
    return pdfResponse(await buildCalibrationSheet(), 'prayerbands-label-alignment.pdf')
  }

  const orderIds = (Array.isArray(body?.orderIds) ? body.orderIds : [])
    .map((n: unknown) => Number(n))
    .filter((n: number) => Number.isInteger(n) && n > 0)
  const startAt = Math.min(Math.max(1, Number(body?.startAt) || 1), LABELS_PER_SHEET)

  if (orderIds.length === 0) {
    return NextResponse.json({ error: 'Pick at least one order.' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: orders, error } = await admin
    .from('orders')
    .select('id, customer_name, customer_email, shipping_address')
    .in('id', orderIds)
  if (error) return NextResponse.json({ error: 'Could not load those orders.' }, { status: 500 })

  // Keep the caller's order so the sheet matches the ticked list on screen.
  const byId = new Map((orders ?? []).map((o: any) => [o.id, o]))
  const labels: SheetLabel[] = []
  const missing: number[] = []

  for (const id of orderIds) {
    const o = byId.get(id)
    const addr = o?.shipping_address
    if (!o || !addr || !addr.line1) { missing.push(id); continue }
    labels.push({
      address: {
        // Label goes to the shipping recipient (gift recipient) when named,
        // else the buyer — never ship a gift under the buyer's name.
        name: addr.name || o.customer_name || o.customer_email,
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        state: addr.state,
        postal_code: addr.postal_code,
        country: addr.country,
      },
    })
  }

  // Printing a sheet with silent gaps would waste labels and, worse, look like
  // it worked. Refuse and name the orders that have no address on file.
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'These orders have no shipping address on file: ' + missing.map(i => '#' + i).join(', '), missing },
      { status: 409 }
    )
  }

  return pdfResponse(await buildLabelSheet(labels, startAt), 'prayerbands-labels.pdf')
}

function pdfResponse(pdf: Uint8Array, filename: string) {
  return new NextResponse(pdf as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="' + filename + '"',
      'Cache-Control': 'no-store',
    },
  })
}
