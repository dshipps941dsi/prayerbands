import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Lets a ministry edit its own profile (name, location, website) and theme
// color from the dashboard Settings tab. Only the org's admin may edit.
export async function POST(req: NextRequest) {
  // Identify the requester from their session cookie.
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
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  // Service-key client: the update bypasses owner-only RLS, but we scope it to
  // the org this user actually administers, so they can only edit their own.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('admin_id', user.id)
    .maybeSingle()
  if (!org) {
    return NextResponse.json({ error: 'You do not manage an organization.' }, { status: 403 })
  }

  // Build the update from only the fields we allow ministries to change.
  const updates: Record<string, string | null> = {}
  if (typeof body.name === 'string') {
    if (!body.name.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 })
    }
    updates.name = body.name.trim()
  }
  if (typeof body.location === 'string') updates.location = body.location.trim() || null
  if (typeof body.website === 'string') updates.website = body.website.trim() || null
  if (typeof body.color === 'string') {
    if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) {
      return NextResponse.json({ error: 'Color must be a hex value like #1a6b4a.' }, { status: 400 })
    }
    updates.color = body.color.toLowerCase()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { data: updated, error } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', org.id)
    .select('*')
    .single()

  if (error) {
    console.error('[update-org-settings] update error:', error)
    return NextResponse.json({ error: 'Could not save changes.' }, { status: 500 })
  }

  return NextResponse.json({ org: updated })
}
