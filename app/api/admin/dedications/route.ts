import { NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamAdmin(user)
}

// Every dedication in one place. Until now a dedication could only be read one
// band at a time, by typing an ID you already knew — fine for checking a band
// in your hand, useless for "what did I write lately", and no help at all for
// spotting one that has gone astray.
//
// Editing already exists (save-dedications with adminOverride) and stays the
// single write path; this is the list that makes it findable.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('bands')
    .select('band_id, status, owner_id, theme, color, size, dedication_recipient, dedication_note, dedication_viewed, dedication_updated_at, created_at, registrations(count)')
    .or('dedication_note.not.is.null,dedication_recipient.not.is.null')
    .order('dedication_updated_at', { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).filter((b: any) =>
    String(b.dedication_note ?? '').trim() !== '' || String(b.dedication_recipient ?? '').trim() !== ''
  )

  // Who owns them, for the ones that are claimed.
  const ownerIds = [...new Set(rows.map((b: any) => b.owner_id).filter(Boolean))] as string[]
  const owners = new Map<string, string>()
  if (ownerIds.length) {
    const { data: profs } = await admin.from('profiles').select('id, email').in('id', ownerIds)
    for (const p of profs ?? []) owners.set(p.id as string, p.email as string)
  }

  // A dedication on a band still in sellable stock is the one that matters most:
  // the picker can allocate it to a paying customer, who opens a message written
  // for somebody else. Flagged here because nothing else would catch it.
  const { data: shelf } = await admin.from('sellable_bands').select('band_id')
  const onShelf = new Set((shelf ?? []).map((b: any) => b.band_id as string))

  const list = rows.map((b: any) => {
    const stops = b.registrations?.[0]?.count ?? 0
    return {
      band_id: b.band_id,
      status: b.status,
      design: [b.theme && b.theme !== 'default' ? b.theme : null, b.color, b.size].filter(Boolean).join(' · ') || '—',
      recipient: b.dedication_recipient ?? '',
      note: b.dedication_note ?? '',
      viewed: !!b.dedication_viewed,
      stops,
      owner_email: b.owner_id ? owners.get(b.owner_id) ?? 'unknown account' : null,
      updated_at: b.dedication_updated_at,
      // Editing only changes what the recipient will see if they haven't
      // already seen it. Say so rather than letting an edit look effective.
      editable: stops === 0 && !b.dedication_viewed,
      on_shelf: onShelf.has(b.band_id),
    }
  })

  return NextResponse.json({ dedications: list, onShelfCount: list.filter(d => d.on_shelf).length })
}
