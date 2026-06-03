import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  const userId = req.nextUrl.searchParams.get('uid')
  if (!userId) return NextResponse.json({ error: 'No user ID' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, organizations(*)')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 404 })
  return NextResponse.json({ profile })
}
