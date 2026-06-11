import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Mark a gift band's dedication as seen so the "sent especially for you" screen
// only shows on the recipient's first tap.
export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { bandId } = await req.json()
  if (!bandId) {
    return NextResponse.json({ error: 'No band ID' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bands')
    .update({ dedication_viewed: true })
    .eq('band_id', bandId)

  if (error) {
    console.error('[mark-dedication-viewed]', error)
    return NextResponse.json({ error: 'Could not update' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
