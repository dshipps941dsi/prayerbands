import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const subdomain = req.nextUrl.searchParams.get('subdomain')
  if (!subdomain) return NextResponse.json({ error: 'No subdomain' }, { status: 400 })

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: stats } = await supabase
    .rpc('get_org_stats', { org_uuid: org.id })

  const { data: prayers } = await supabase
    .from('registrations')
    .select('band_id, user_name, prayer, city, country, registered_at')
    .not('prayer', 'is', null)
    .order('registered_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ org, stats, prayers: prayers || [] })
}
