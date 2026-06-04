import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin() {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authed.auth.getUser()
  return !!user && user.email === ADMIN_EMAIL
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  try {
    const { org_id, band_ids } = await req.json()
    if (!org_id || !band_ids?.length) {
      return NextResponse.json({ error: 'Missing org_id or band_ids' }, { status: 400 })
    }

    // Get org to verify it exists
    const { data: org } = await supabase
      .from('organizations')
      .select('id, prefix')
      .eq('id', org_id)
      .single()

    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

    // Upsert bands — create if not exists, update org_id if exists
    const bandsToUpsert = band_ids.map((band_id: string) => ({
      band_id: band_id.toUpperCase(),
      org_id,
      status: 'unregistered',
    }))

    const { error } = await supabase
      .from('bands')
      .upsert(bandsToUpsert, { onConflict: 'band_id', ignoreDuplicates: false })

    if (error) throw error

    return NextResponse.json({ success: true, count: band_ids.length })
  } catch (err: any) {
    console.error('Assign bands error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
