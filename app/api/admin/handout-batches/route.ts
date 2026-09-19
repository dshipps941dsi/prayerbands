import { NextRequest, NextResponse } from 'next/server'
import { isTeamMember } from '@/lib/team'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { findAuthUserByEmail } from '@/lib/find-auth-user'

// Recent batches of bands scanned out of stock, grouped the way they were
// scanned (one submit = one batch), and a way to credit a batch to a giver
// later. Bands are often handed over in a hurry with no email; the credit can
// be added here once the person's address is known, so their downline forms.

async function teamUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (await isTeamMember(user)) ? user : null
}

type HandoutRow = {
  id: number; band_id: string; reason: string; recipient_name: string | null; recipient_email: string | null
  upline_user_id: string | null; upline_email: string | null; note: string | null; created_at: string
}

// GET /api/admin/handout-batches?days=90
export async function GET(req: NextRequest) {
  if (!(await teamUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days') || 90)))
  const admin = createServiceClient()

  const { data: rows, error } = await admin
    .from('band_handouts')
    .select('id, band_id, reason, recipient_name, recipient_email, upline_user_id, upline_email, note, created_at')
    .eq('direction', 'out')
    .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const handouts = (rows ?? []) as HandoutRow[]
  if (!handouts.length) return NextResponse.json({ batches: [] })

  const bandIds = [...new Set(handouts.map(h => h.band_id))]
  const [{ data: bands }, { data: regs }, { data: profs }] = await Promise.all([
    admin.from('bands').select('band_id, theme, color, size, status, owner_id, upline_email, upline_user_id').in('band_id', bandIds),
    admin.from('registrations').select('band_id, user_name, user_id, registered_at').in('band_id', bandIds).order('registered_at', { ascending: false }),
    admin.from('profiles').select('id, full_name, email').in('id', [...new Set(handouts.map(h => h.upline_user_id).filter(Boolean))] as string[]),
  ])
  const bandById = new Map((bands ?? []).map((b: any) => [b.band_id as string, b]))
  const latestStop = new Map<string, any>()
  for (const r of (regs ?? []) as any[]) if (!latestStop.has(r.band_id)) latestStop.set(r.band_id, r)
  const profById = new Map((profs ?? []).map((p: any) => [p.id as string, p]))

  // One batch = rows written by the same submit: same second, reason, recipient and credit.
  const batches = new Map<string, any>()
  for (const h of handouts) {
    const second = h.created_at.slice(0, 19)
    const key = [second, h.reason, h.recipient_name ?? '', h.upline_email ?? '', h.note ?? ''].join('|')
    let b = batches.get(key)
    if (!b) {
      const giver = h.upline_user_id ? profById.get(h.upline_user_id) : null
      b = {
        key, created_at: h.created_at, reason: h.reason, recipient_name: h.recipient_name, recipient_email: h.recipient_email, note: h.note,
        upline_email: h.upline_email, upline_user_id: h.upline_user_id, upline_name: giver?.full_name ?? null,
        handout_ids: [] as number[], bands: [] as any[],
      }
      batches.set(key, b)
    }
    const band = bandById.get(h.band_id)
    const stop = latestStop.get(h.band_id)
    b.handout_ids.push(h.id)
    b.bands.push({
      band_id: h.band_id,
      label: band ? [band.theme && band.theme !== 'default' ? band.theme : band.color, band.size].filter(Boolean).join(' · ') : null,
      status: band?.status ?? null,
      taken: !!(band?.owner_id || stop),
      holder: stop?.user_name ?? null,
      // The band's own credit right now, which may differ from the batch row
      // if it was credited later by hand.
      credited_to: band?.upline_email ?? null,
    })
  }
  return NextResponse.json({ batches: [...batches.values()] })
}

// POST /api/admin/handout-batches  { handout_ids: number[], email }
// Credit the bands in a batch to a giver by email. Works with or without an
// account: the address is stored and resolves to a user id on sign-up.
export async function POST(req: NextRequest) {
  const user = await teamUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const ids = (Array.isArray(body.handout_ids) ? body.handout_ids : []).map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0)
  const address = String(body.email || '').trim().toLowerCase()
  if (!ids.length) return NextResponse.json({ error: 'No batch selected.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return NextResponse.json({ error: `"${address}" does not look like an email address.` }, { status: 400 })

  const admin = createServiceClient()
  const { data: rows } = await admin.from('band_handouts').select('id, band_id').in('id', ids).eq('direction', 'out')
  const bandIds = [...new Set((rows ?? []).map((r: any) => r.band_id as string))]
  if (!bandIds.length) return NextResponse.json({ error: 'Those hand-out records were not found.' }, { status: 404 })

  const authUser = await findAuthUserByEmail(admin, address)
  const uplineUserId = authUser?.id ?? null

  const { data: updated, error } = await admin
    .from('bands')
    .update({ upline_email: address, upline_user_id: uplineUserId })
    .in('band_id', bandIds)
    .select('band_id, owner_id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await admin.from('band_handouts').update({ upline_email: address, upline_user_id: uplineUserId }).in('id', ids)

  // A band already taken: its holder hangs under the giver, first-wins, the
  // same as set-upline and claim-band do.
  const placed: string[] = []
  if (uplineUserId) {
    const seen = new Set<string>()
    for (const b of (updated ?? []) as any[]) {
      if (!b.owner_id || b.owner_id === uplineUserId || seen.has(b.owner_id)) continue
      seen.add(b.owner_id)
      const { data: p } = await admin.from('profiles').update({ upline_user_id: uplineUserId, upline_band_id: b.band_id }).eq('id', b.owner_id).is('upline_user_id', null).select('full_name')
      if (p && p.length) placed.push(p[0].full_name || b.owner_id)
    }
  }

  return NextResponse.json({ success: true, email: address, linked: !!uplineUserId, count: (updated ?? []).length, placed })
}
