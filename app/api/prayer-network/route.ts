import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  // The caller may only ever read THEIR OWN network. Derive the user from the
  // session cookie — never from a client-supplied `uid` (that was an IDOR that
  // let anyone dump any user's friends + emails).
  const authed = await createServerClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user.id
  const supabase = createServiceClient()

  const { data: sender } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()

  const senderEmail = sender?.email

  const { data: senderBands } = await supabase
    .from('bands')
    .select('band_id')
    .eq('owner_id', userId)

  const senderBandIds = (senderBands || []).map((b: any) => b.band_id)
  if (senderBandIds.length === 0) return NextResponse.json({ network: [] })

  const { data: allRegs } = await supabase
    .from('registrations')
    .select('email, user_name, band_id, registered_at')
    .in('band_id', senderBandIds)
    .not('email', 'is', null)
    .order('registered_at', { ascending: true })

  const network: { email: string, name: string, relationship: string }[] = []

  const firstPerBand: Record<string, any> = {}
  ;(allRegs || []).forEach((r: any) => {
    if (!firstPerBand[r.band_id]) firstPerBand[r.band_id] = r
  })

  Object.values(firstPerBand).forEach((r: any) => {
    if (r.email !== senderEmail && !network.find(e => e.email === r.email)) {
      network.push({ email: r.email, name: r.user_name || 'Friend', relationship: 'gave you a band' })
    }
  })

  const latestPerBand: Record<string, any> = {}
  ;(allRegs || []).forEach((r: any) => {
    latestPerBand[r.band_id] = r
  })

  Object.values(latestPerBand).forEach((r: any) => {
    if (r.email !== senderEmail && !network.find(e => e.email === r.email)) {
      network.push({ email: r.email, name: r.user_name || 'Friend', relationship: 'received your band' })
    }
  })

  return NextResponse.json({ network })
}
