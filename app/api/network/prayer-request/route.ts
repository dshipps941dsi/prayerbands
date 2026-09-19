import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/network/prayer-request  { request_text, audience, anonymity }
// Share a prayer request with a chosen audience.
//   audience: 'network' (all partners) | 'direct' | 'lineage' | 'wall'
//   anonymity (wall only): 'anonymous' | 'first_initial'
// visibility is derived: 'wall' → 'public' (prayer wall), everything else 'private'.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const request_text = body.request_text
    if (!request_text?.trim()) {
      return NextResponse.json({ error: 'Prayer request text is required' }, { status: 400 })
    }
    // A journal entry is a prayer (shareable), a note, or a saved verse. Notes
    // and verses are the person's own — they are always private.
    const kind: 'prayer' | 'note' | 'verse' = body.kind === 'note' ? 'note' : body.kind === 'verse' ? 'verse' : 'prayer'
    const verse_ref = kind === 'verse' ? String(body.verse_ref || '').trim().slice(0, 80) || null : null
    // The headline above the details ("Mom's surgery"). A verse's reference
    // is its headline, so it carries none.
    const title = kind === 'verse' ? null : String(body.title || '').trim().slice(0, 120) || null
    if (kind !== 'prayer') body.audience = 'private'

    // Accept `audience`; tolerate the old `visibility` field for safety.
    // 'private' is a journal entry kept to yourself: saved, but the others-feed
    // (my-network's reaches()) never surfaces it to anyone else.
    // 'group:<uuid>' shares only with the members of one of your partner groups.
    const AUDIENCES = new Set(['private', 'network', 'direct', 'lineage', 'wall'])
    let audience: string = String(body.audience || '')
    const groupMatch = /^group:([0-9a-fA-F-]{36})$/.exec(audience)
    if (groupMatch) {
      // The group must be the sender's own, or we fall back to private rather
      // than trust a group id the sender doesn't own.
      const svc = createServiceClient()
      const { data: g } = await svc
        .from('partner_groups')
        .select('id')
        .eq('id', groupMatch[1])
        .eq('owner_id', user.id)
        .maybeSingle()
      if (!g) audience = 'private'
    } else if (!AUDIENCES.has(audience)) {
      audience = body.visibility === 'public' ? 'wall' : 'network'
    }
    const vis = audience === 'wall' ? 'public' : 'private'
    const anonymity = body.anonymity

    // Optional journal list — validated as the sender's own, else dropped.
    let list_id: string | null = null
    if (body.list_id && /^[0-9a-fA-F-]{36}$/.test(String(body.list_id))) {
      const svc = createServiceClient()
      const { data: l } = await svc
        .from('journal_lists')
        .select('id')
        .eq('id', String(body.list_id))
        .eq('owner_id', user.id)
        .maybeSingle()
      if (l) list_id = String(body.list_id)
    }

    // For public requests, freeze a display name now: "Anonymous", or first
    // name + last initial from the user's profile.
    let public_name: string | null = null
    if (vis === 'public') {
      if (anonymity === 'first_initial') {
        const admin = createServiceClient()
        const { data: prof } = await admin
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .maybeSingle()
        const full = (prof?.full_name || '').trim()
        if (full) {
          const parts = full.split(/\s+/)
          const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0].toUpperCase()}.` : ''
          public_name = lastInitial ? `${parts[0]} ${lastInitial}` : parts[0]
        } else {
          public_name = prof?.email?.split('@')[0] || 'A believer'
        }
      } else {
        public_name = 'Anonymous'
      }
    }

    // Exclude specific partners from a network/group share — for a request that's
    // personal to leave out someone in your network. Only meaningful when sharing
    // with people, so it's dropped for private journal entries and the wall.
    const excludedIds: string[] = Array.isArray(body.excluded_user_ids)
      ? [...new Set(body.excluded_user_ids.map((x: any) => String(x)).filter((s: string) => /^[0-9a-fA-F-]{36}$/.test(s)))] as string[]
      : []
    const excluded_user_ids = (audience === 'private' || audience === 'wall') ? [] : excludedIds

    const row = { user_id: user.id, request_text: request_text.trim(), visibility: vis, audience, public_name, list_id, excluded_user_ids, allow_comments: body.allow_comments === true && audience !== 'private' }
    let { data: request, error } = await supabase
      .from('prayer_network_requests')
      .insert({ ...row, kind, verse_ref, title })
      .select()
      .single()
    if (error && (error as any).code === '42703') {
      // A journal migration has not run yet: try without the title, then as a plain entry.
      ;({ data: request, error } = await supabase.from('prayer_network_requests').insert({ ...row, kind, verse_ref }).select().single())
      if (error && (error as any).code === '42703') ({ data: request, error } = await supabase.from('prayer_network_requests').insert(row).select().single())
    }

    if (error || !request) {
      console.error('Network prayer request insert error:', error)
      return NextResponse.json({ error: 'Failed to share prayer request' }, { status: 500 })
    }

    return NextResponse.json({ request })
  } catch (err) {
    console.error('Network prayer request error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/network/prayer-request  { request_id, is_answered?, request_text?, verse_ref?, list_id? }
// Mark your own request answered / unanswered, or edit what you wrote.
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { request_id, is_answered } = body
    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {}
    if (typeof is_answered === 'boolean') { patch.is_answered = is_answered; patch.answered_at = is_answered ? new Date().toISOString() : null }
    if (typeof body.request_text === 'string') {
      const t = body.request_text.trim()
      if (!t) return NextResponse.json({ error: 'The entry cannot be empty' }, { status: 400 })
      patch.request_text = t.slice(0, 2000)
    }
    if (typeof body.verse_ref === 'string') patch.verse_ref = body.verse_ref.trim().slice(0, 80) || null
    if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 120) || null
    if (body.list_id === null) patch.list_id = null
    else if (typeof body.list_id === 'string' && /^[0-9a-fA-F-]{36}$/.test(body.list_id)) {
      const { data: l } = await supabase.from('journal_lists').select('id').eq('id', body.list_id).eq('owner_id', user.id).maybeSingle()
      if (l) patch.list_id = body.list_id
    }
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })

    // RLS ("manage their own") restricts this to the owner.
    const { data: updated, error } = await supabase
      .from('prayer_network_requests')
      .update(patch)
      .eq('id', request_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    return NextResponse.json({ request: updated })
  } catch (err) {
    console.error('Network prayer request PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/network/prayer-request?request_id=XXX
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const request_id = req.nextUrl.searchParams.get('request_id')
    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('prayer_network_requests')
      .delete()
      .eq('id', request_id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Network prayer request DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
