import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Gate the public /dedicate form: only someone with the band's secret token
// (from the shipping email link) may write its dedication.
export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const bandId = req.nextUrl.searchParams.get('bandId')
  const token = req.nextUrl.searchParams.get('token')

  if (!bandId || !token) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const { data: band } = await supabase
    .from('bands')
    .select('dedication_token, dedication_recipient, dedication_note')
    .eq('band_id', bandId)
    .single()

  if (!band || band.dedication_token !== token) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  return NextResponse.json({
    valid: true,
    dedication_recipient: band.dedication_recipient,
    dedication_note: band.dedication_note,
  })
}
