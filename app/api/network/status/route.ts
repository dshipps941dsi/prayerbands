import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolveBandRecipient, isBandHolder, nameFromProfile } from '@/lib/network'

// GET /api/network/status?bandId=XXX
// Tells the band page which connection prompt to show for the current viewer.
export async function GET(req: NextRequest) {
  try {
    const bandId = req.nextUrl.searchParams.get('bandId')
    if (!bandId) {
      return NextResponse.json({ error: 'bandId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ logged_in: false })
    }

    const admin = createServiceClient()
    const recipientId = await resolveBandRecipient(admin, bandId)

    // No account holds this band — nobody to connect with.
    if (!recipientId) {
      return NextResponse.json({ logged_in: true, self: false, can_connect: false, reason: 'no_account' })
    }
    // Viewer is the holder — it's their own band.
    if (recipientId === user.id) {
      return NextResponse.json({ logged_in: true, self: true })
    }

    const viewerIsBandHolder = await isBandHolder(admin, user.id)

    const { data: rprofile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', recipientId)
      .single()
    const recipientName = nameFromProfile(rprofile)

    // Existing connection between the two, in either direction.
    const { data: conn } = await supabase
      .from('prayer_network_connections')
      .select('id, requester_id, status')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`)
      .maybeSingle()

    let status = 'none'
    if (conn) {
      if (conn.status === 'accepted') status = 'accepted'
      else if (conn.status === 'pending') status = conn.requester_id === user.id ? 'pending_sent' : 'pending_received'
    }

    return NextResponse.json({
      logged_in: true,
      self: false,
      can_connect: true,
      recipient_id: recipientId,
      recipient_name: recipientName,
      viewer_is_band_holder: viewerIsBandHolder,
      status,
    })
  } catch (err) {
    console.error('Network status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
