import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

// Verify the caller is the signed-in admin (cookie session), then operate with
// the service role so reads/writes work regardless of site_config RLS.
async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createServiceClient()
  const { data, error } = await admin
    .from('site_config')
    .select('key, value, label')
    .order('key')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { key, value } = await req.json()
  if (!key || value === undefined || value === null) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 })
  }
  const admin = createServiceClient()
  const { error } = await admin
    .from('site_config')
    .update({ value: String(value), updated_at: new Date().toISOString() })
    .eq('key', key)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
