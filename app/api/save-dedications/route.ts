import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { dedications, userId } = await req.json()

  if (!dedications || !Array.isArray(dedications)) {
    return NextResponse.json({ error: 'Invalid dedications' }, { status: 400 })
  }

  for (const d of dedications) {
    if (d.bandId && (d.recipientName?.trim() || d.note?.trim())) {
      await supabase.from('bands').update({
        dedication_recipient: d.recipientName?.trim() || null,
        dedication_note: d.note?.trim() || null,
        owner_id: userId ?? null,
      }).eq('band_id', d.bandId)
    } else if (d.bandId && userId) {
      // Still link owner even if no dedication text
      await supabase.from('bands').update({
        owner_id: userId,
      }).eq('band_id', d.bandId)
    }
  }

  return NextResponse.json({ success: true })
}