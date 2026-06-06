import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { bandId, userId, note } = await req.json()

  if (!bandId || !userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Insert transfer record
  const { error: transferError } = await supabase
    .from('band_transfers')
    .insert({ band_id: bandId, from_user_id: userId, note, status: 'pending' })

  if (transferError) {
    return NextResponse.json({ error: transferError.message }, { status: 500 })
  }

  // Update band status
  const { error: bandError } = await supabase
    .from('bands')
    .update({ status: 'pending_transfer' })
    .eq('band_id', bandId)

  if (bandError) {
    return NextResponse.json({ error: bandError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}