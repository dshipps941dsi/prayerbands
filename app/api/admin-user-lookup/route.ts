import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

export async function GET(req: NextRequest) {
  // Gate to the admin account.
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await authed.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ profile: null })

  // Service key bypasses the owner-only RLS on profiles.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // 1. Search the profiles table by email or name.
  const { data: profiles } = await admin
    .from('profiles')
    .select('*')
    .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(1)

  let profile: any = profiles?.[0] || null

  // 2. Fallback: profiles.email may be empty for some accounts — find the auth
  //    user by exact email, then load their profile row by id.
  if (!profile && q.includes('@')) {
    const target = q.toLowerCase()
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (error) break
      const match = data.users.find(u => u.email?.toLowerCase() === target)
      if (match) {
        const { data: prof } = await admin.from('profiles').select('*').eq('id', match.id).maybeSingle()
        profile = prof
          ? { ...prof, email: prof.email || match.email }
          : { id: match.id, email: match.email, full_name: match.user_metadata?.full_name || null }
        break
      }
      if (data.users.length < 200) break
    }
  }

  if (!profile) return NextResponse.json({ profile: null })

  // 3. Their bands (with registration counts).
  const { data: bands } = await admin
    .from('bands')
    .select('band_id, created_at, registrations(count)')
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ profile, bands: bands || [] })
}
