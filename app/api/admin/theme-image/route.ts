import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'
const BUCKET = 'theme-images'
const MAX_BYTES = 6 * 1024 * 1024 // 6MB — background images run larger
const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

// Upload a theme background image to Supabase Storage and return its public URL.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const key = String(form?.get('key') || 'theme').replace(/[^a-z0-9-]/gi, '') || 'theme'
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }
  const ext = ALLOWED[file.type]
  if (!ext) return NextResponse.json({ error: 'Image must be PNG, JPG, or WEBP.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image must be under 6MB.' }, { status: 400 })

  const admin = createServiceClient()
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const path = `${key}/${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: true })
  if (upErr) {
    console.error('[theme-image] upload error:', upErr)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl })
}
