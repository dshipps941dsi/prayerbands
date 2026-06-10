import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrg, serviceClient } from '@/lib/org-auth'

const BUCKET = 'org-logos'
const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

// Upload a ministry logo to Supabase Storage and save its URL on the org.
// Any member of the org may upload.
export async function POST(req: NextRequest) {
  const { userId, orgId } = await getSessionOrg()
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (!orgId) {
    return NextResponse.json({ error: 'You are not part of an organization.' }, { status: 403 })
  }

  const admin = serviceClient()
  const org = { id: orgId }

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
