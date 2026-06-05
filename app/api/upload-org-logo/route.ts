import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const BUCKET = 'org-logos'
const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

// Upload a ministry logo to Supabase Storage and save its URL on the org.
// Only the org's admin may upload.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await authed.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

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

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }
  const ext = ALLOWED[file.type]
  if (!ext) {
    return NextResponse.json({ error: 'Logo must be a PNG, JPG, WEBP, or SVG.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Logo must be under 2MB.' }, { status: 400 })
  }

  // Ensure the public bucket exists (no-op if it already does).
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const path = `${org.id}/logo-${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true })
  if (upErr) {
    console.error('[upload-org-logo] storage error:', upErr)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
  const logo_url = pub.publicUrl

  const { data: updated, error } = await admin
    .from('organizations')
    .update({ logo_url })
    .eq('id', org.id)
    .select('*')
    .single()
  if (error) {
    console.error('[upload-org-logo] update error:', error)
    return NextResponse.json({ error: 'Could not save logo.' }, { status: 500 })
  }

  return NextResponse.json({ org: updated, logo_url })
}
