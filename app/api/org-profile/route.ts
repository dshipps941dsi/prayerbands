import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  const userId = req.nextUrl.searchParams.get('uid')
  if (!userId) return NextResponse.json({ error: 'No user ID' }, { status: 400 })

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle()

  if (profileError || !profile?.org_id) {
    return NextResponse.json({ error: 'No org', profileError, userId }, { status: 404 })
  }

  // Get org separately
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.org_id)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Org not found', orgError }, { status: 404 })
  }

  return NextResponse.json({ profile: { ...profile, organizations: org } })
}
