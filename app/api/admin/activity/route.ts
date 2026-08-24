import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BUILTIN_THEMES } from '@/lib/themes'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function callerEmail(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email ?? null
}

type Event = {
  kind: 'registration' | 'transfer' | 'ownership'
  at: string
  band_id: string
  who: string | null
  email: string | null
  detail: string | null
  // What the band physically is — "Beach · M", "Black · L". A band ID alone
  // says nothing about the thing in someone's hand.
  style: string | null
}

// Read-only launch telemetry: one reverse-chronological feed of what is
// happening to bands in the wild, a full history for any single band, and an
// inventory breakdown. Built for the seeding period, where the failures worth
// catching (a dedication that saved nowhere, a registration orphaned from its
// account, a stop with no coordinates) were invisible from the admin panel and
// only showed up in direct SQL.
export async function GET(req: NextRequest) {
  if ((await callerEmail()) !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  const url = req.nextUrl
  const bandFilter = (url.searchParams.get('bandId') || '').trim().toUpperCase()
  const emailFilter = (url.searchParams.get('email') || '').trim().toLowerCase()
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500)

  // ── Single-band history ───────────────────────────────────────────────
  if (url.searchParams.get('mode') === 'band' && bandFilter) {
    const { data: band } = await admin
      .from('bands')
      .select('band_id, status, theme, color, size, batch, owner_id, org_id, upline_user_id, upline_email, dedication_recipient, dedication_note, dedication_viewed, created_at')
      .eq('band_id', bandFilter)
      .maybeSingle()

    if (!band) return NextResponse.json({ error: `No band found with ID "${bandFilter}".` }, { status: 404 })

    const [{ data: regs }, { data: transfers }, { data: owners }] = await Promise.all([
      admin.from('registrations')
        .select('id, user_id, user_name, email, city, state, country, latitude, longitude, prayer, registered_at')
        .eq('band_id', bandFilter).order('registered_at', { ascending: true }),
      admin.from('band_transfers')
        .select('id, from_user_id, note, status, created_at, completed_at')
        .eq('band_id', bandFilter).order('created_at', { ascending: true }),
      // Ordered by id, not changed_at: writes inside one transaction share a
      // timestamp, so id is the only reliable tiebreaker.
      admin.from('band_ownership_events')
        .select('id, old_owner_id, new_owner_id, changed_at')
        .eq('band_id', bandFilter).order('id', { ascending: true }),
    ])

    // ── Lineage ─────────────────────────────────────────────────────────
    // The band's history says where the object went. Lineage says what it grew:
    // who put it into circulation, who joined the network because of it, and
    // everyone who has since come in under those people.
    const { data: introducedRows } = await admin
      .from('profiles')
      .select('id, email, full_name, created_at')
      .eq('upline_band_id', bandFilter)
      .order('created_at', { ascending: true })

    const introduced = await Promise.all((introducedRows ?? []).map(async (p: any) => {
      // Recursive walk, capped inside the function at 20 levels.
      const { data: tree } = await admin.rpc('downline_of', { root: p.id, max_depth: 20 })
      const rows = (tree ?? []) as { user_id: string; depth: number }[]
      const treeEmails = await emailsFor(admin, rows.map(r => r.user_id))
      const { data: names } = rows.length
        ? await admin.from('profiles').select('id, full_name').in('id', rows.map(r => r.user_id))
        : { data: [] as any[] }
      const nameById = new Map((names ?? []).map((n: any) => [n.id as string, n.full_name as string | null]))
      return {
        id: p.id,
        email: p.email,
        name: p.full_name,
        joined_at: p.created_at,
        downline: rows
          .sort((a, b) => a.depth - b.depth)
          .map(r => ({ depth: r.depth, email: treeEmails.get(r.user_id) ?? null, name: nameById.get(r.user_id) ?? null })),
      }
    }))

    const ids = [
      band.owner_id,
      band.upline_user_id,
      ...(regs ?? []).map(r => r.user_id),
      ...(transfers ?? []).map(t => t.from_user_id),
      ...(owners ?? []).flatMap(o => [o.old_owner_id, o.new_owner_id]),
    ].filter(Boolean) as string[]
    const emails = await emailsFor(admin, ids)

    return NextResponse.json({
      band: { ...band, owner_email: band.owner_id ? emails.get(band.owner_id) ?? null : null },
      registrations: (regs ?? []).map(r => ({
        ...r,
        account_email: r.user_id ? emails.get(r.user_id) ?? null : null,
        // The distinction that caused real confusion: a guest registration is
        // not linked to any account, so the person cannot pass the band on.
        linked: !!r.user_id,
        geocoded: r.latitude != null && r.longitude != null,
      })),
      transfers: (transfers ?? []).map(t => ({
        ...t,
        from_email: t.from_user_id ? emails.get(t.from_user_id) ?? null : null,
      })),
      ownership: (owners ?? []).map(o => ({
        ...o,
        old_email: o.old_owner_id ? emails.get(o.old_owner_id) ?? null : null,
        new_email: o.new_owner_id ? emails.get(o.new_owner_id) ?? null : null,
      })),
      lineage: {
        // Credit can sit on an email alone: bands are routinely handed out on
        // behalf of someone with no account yet, and it attaches on signup.
        giver_email: band.upline_user_id ? emails.get(band.upline_user_id) ?? null : (band.upline_email ?? null),
        giver_pending: !band.upline_user_id && !!band.upline_email,
        introduced,
      },
    })
  }

  // ── Merged activity feed ──────────────────────────────────────────────
  let regQuery = admin.from('registrations')
    .select('id, band_id, user_id, user_name, email, city, state, country, latitude, longitude, registered_at')
    .order('registered_at', { ascending: false }).limit(limit)
  if (bandFilter) regQuery = regQuery.eq('band_id', bandFilter)

  let transferQuery = admin.from('band_transfers')
    .select('id, band_id, from_user_id, note, status, created_at')
    .order('created_at', { ascending: false }).limit(limit)
  if (bandFilter) transferQuery = transferQuery.eq('band_id', bandFilter)

  let ownerQuery = admin.from('band_ownership_events')
    .select('id, band_id, old_owner_id, new_owner_id, changed_at')
    .order('id', { ascending: false }).limit(limit)
  if (bandFilter) ownerQuery = ownerQuery.eq('band_id', bandFilter)

  const [{ data: regs }, { data: transfers }, { data: owners }] = await Promise.all([regQuery, transferQuery, ownerQuery])

  const ids = [
    ...(regs ?? []).map(r => r.user_id),
    ...(transfers ?? []).map(t => t.from_user_id),
    ...(owners ?? []).flatMap(o => [o.old_owner_id, o.new_owner_id]),
  ].filter(Boolean) as string[]
  const emails = await emailsFor(admin, ids)

  // Band styling for every band appearing in the feed, so a row reads as a
  // real object rather than a code.
  const eventBandIds = [...new Set([
    ...(regs ?? []).map(r => r.band_id),
    ...(transfers ?? []).map(t => t.band_id),
    ...(owners ?? []).map(o => o.band_id),
  ].filter(Boolean) as string[])]

  const styles = new Map<string, string>()
  if (eventBandIds.length > 0) {
    const [{ data: bandRows }, { data: themeRows }] = await Promise.all([
      admin.from('bands').select('band_id, theme, color, size').in('band_id', eventBandIds),
      admin.from('band_themes').select('key, label'),
    ])
    // Built-in theme names live in code and only overridden/custom ones reach
    // band_themes, so merge both or a stock theme shows as its raw key
    // ("beach" rather than "Beach").
    const themeLabels = new Map<string, string>(
      Object.entries(BUILTIN_THEMES).map(([key, t]) => [key, t.label])
    )
    for (const t of themeRows ?? []) themeLabels.set(t.key as string, t.label as string)
    for (const b of bandRows ?? []) {
      // "default" is the plain band — its colour is the identifying feature, so
      // naming the theme there would just add noise to every row.
      const themeName = b.theme && b.theme !== 'default'
        ? (themeLabels.get(b.theme) ?? b.theme)
        : null
      const parts = [themeName, b.color, b.size].filter(Boolean)
      if (parts.length) styles.set(b.band_id as string, parts.join(' · '))
    }
  }

  const events: Event[] = [
    ...(regs ?? []).map(r => ({
      kind: 'registration' as const,
      at: r.registered_at as string,
      band_id: r.band_id as string,
      style: styles.get(r.band_id as string) ?? null,
      who: r.user_name ?? null,
      email: (r.user_id ? emails.get(r.user_id) : null) ?? r.email ?? null,
      detail: [
        [r.city, r.state, r.country].filter(Boolean).join(', ') || 'no location',
        r.user_id ? null : 'GUEST — not linked to an account',
        r.latitude == null ? 'no map pin' : null,
      ].filter(Boolean).join(' · '),
    })),
    ...(transfers ?? []).map(t => ({
      kind: 'transfer' as const,
      at: t.created_at as string,
      band_id: t.band_id as string,
      style: styles.get(t.band_id as string) ?? null,
      who: null,
      email: (t.from_user_id ? emails.get(t.from_user_id) : null) ?? null,
      detail: [`passed on (${t.status})`, t.note ? `"${t.note}"` : null].filter(Boolean).join(' · '),
    })),
    ...(owners ?? []).map(o => {
      const from = o.old_owner_id ? emails.get(o.old_owner_id) ?? 'unknown' : null
      const to = o.new_owner_id ? emails.get(o.new_owner_id) ?? 'unknown' : null
      return {
        kind: 'ownership' as const,
        at: o.changed_at as string,
        band_id: o.band_id as string,
        style: styles.get(o.band_id as string) ?? null,
        who: null,
        // The account the band ended up on — what you filter by when someone
        // says "my band isn't showing".
        email: to,
        detail: to
          ? (from ? `reassigned from ${from}` : 'claimed to account')
          : `released from ${from ?? 'unknown'}`,
      }
    }),
  ]
    .filter(e => !emailFilter || (e.email || '').toLowerCase().includes(emailFilter))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit)

  // ── Inventory ─────────────────────────────────────────────────────────
  // The dashboard's single "available" number hides what actually matters when
  // filling an order: whether a given colour and size is still in stock.
  const { data: stock } = await admin
    .from('bands')
    .select('theme, color, size, status, owner_id, org_id')

  const rows = stock ?? []
  // Read the shelf through the same view the storefront and the picker use, so
  // this dashboard cannot quietly report more stock than the store will sell.
  const { data: shelfRows } = await admin
    .from('sellable_bands')
    .select('theme, color, size')
  const sellable = shelfRows ?? []
  const byKey = new Map<string, number>()
  for (const b of sellable) {
    const key = `${b.theme || 'default'}|${b.color || '—'}|${b.size || '—'}`
    byKey.set(key, (byKey.get(key) ?? 0) + 1)
  }

  return NextResponse.json({
    events,
    inventory: {
      sellable: sellable.length,
      org_stock: rows.filter(b => b.org_id).length,
      registered: rows.filter(b => b.status === 'registered').length,
      // Given away rather than sold. Counted separately so the sellable number
      // stays honest about what is actually still in the box.
      handed_out: rows.filter(b => b.status === 'handed_out').length,
      total: rows.length,
      breakdown: [...byKey.entries()]
        .map(([key, count]) => {
          const [theme, color, size] = key.split('|')
          return { theme, color, size, count }
        })
        .sort((a, b) => a.theme.localeCompare(b.theme) || a.color.localeCompare(b.color) || a.size.localeCompare(b.size)),
    },
  })
}

// auth.users has no queryable email column from PostgREST, so resolve through
// profiles — which every account now has, thanks to the on_auth_user_created
// trigger and its backfill.
async function emailsFor(admin: ReturnType<typeof createServiceClient>, ids: string[]) {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Map<string, string>()
  const { data } = await admin.from('profiles').select('id, email').in('id', unique)
  return new Map((data ?? []).map(p => [p.id as string, p.email as string]))
}
