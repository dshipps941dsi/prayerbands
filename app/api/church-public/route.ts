import { publicName } from '@/lib/public-name'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const subdomain = req.nextUrl.searchParams.get('subdomain')
  if (!subdomain) {
    return NextResponse.json({ error: 'No subdomain' }, {
      status: 400,
      headers: corsHeaders(),
    })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (!org) {
    return NextResponse.json({ error: 'Not found' }, {
      status: 404,
      headers: corsHeaders(),
    })
  }

  const { data: stats } = await supabase
    .rpc('get_org_stats', { org_uuid: org.id })

  // Only THIS church's bands, and only what the public wall shows: first name
  // + last initial, no band IDs. This used to return the ten latest prayers
  // site-wide with full names and IDs, cross-origin, which undid the scrubbing
  // the wall does on purpose.
  const { data: orgBands } = await supabase.from('bands').select('band_id').eq('org_id', org.id).limit(2000)
  const orgBandIds = (orgBands || []).map((b: any) => b.band_id)
  const { data: prayerRows } = orgBandIds.length
    ? await supabase
        .from('registrations')
        .select('user_name, prayer, city, country, registered_at, flagged')
        .in('band_id', orgBandIds)
        .not('prayer', 'is', null)
        .eq('flagged', false)
        .order('registered_at', { ascending: false })
        .limit(10)
    : { data: [] as any[] }
  const prayers = (prayerRows || []).map((r: any) => ({
    user_name: publicName(r.user_name),
    prayer: r.prayer,
    city: r.city,
    country: r.country,
    registered_at: r.registered_at,
  }))

  // Public fields only — never the admin's user id, billing or contact details.
  const publicOrg = {
    id: org.id, name: org.name, subdomain: org.subdomain, plan: org.plan ?? null,
    logo_url: org.logo_url ?? null, description: org.description ?? null,
    website: org.website ?? null, location: org.location ?? null, created_at: org.created_at,
  }

  return NextResponse.json({ org: publicOrg, stats, prayers }, {
    headers: corsHeaders(),
  })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}
