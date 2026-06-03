import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY!)

  try {
    const { userId, prayerText, anonymous, excludedEmails = [] } = await req.json()
    if (!userId || !prayerText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get sender profile
    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single()

    const senderName = anonymous ? 'Someone in your PrayerBands network' : (sender?.display_name || 'A friend')
    const senderEmail = sender?.email

    // Get all bands owned by sender
    const { data: senderBands } = await supabase
      .from('bands')
      .select('band_id')
      .eq('owner_id', userId)

    const senderBandIds = (senderBands || []).map((b: any) => b.band_id)

    const networkEmails: { email: string, name: string, relationship: string, bandId: string }[] = []

    if (senderBandIds.length > 0) {
      // UPLINE — first registration on each band (origin/giver)
      const { data: allRegs } = await supabase
        .from('registrations')
        .select('email, user_name, band_id, registered_at')
        .in('band_id', senderBandIds)
        .not('email', 'is', null)
        .order('registered_at', { ascending: true })

      // First reg per band = upline
      const firstPerBand: Record<string, any> = {}
      ;(allRegs || []).forEach((r: any) => {
        if (!firstPerBand[r.band_id]) firstPerBand[r.band_id] = r
      })

      Object.values(firstPerBand).forEach((r: any) => {
        if (r.email !== senderEmail && !networkEmails.find(e => e.email === r.email)) {
          networkEmails.push({ email: r.email, name: r.user_name || 'Friend', relationship: 'gave you a band', bandId: r.band_id })
        }
      })

      // DOWNLINE — latest registration on each band (current holder)
      const { data: latestRegs } = await supabase
        .from('registrations')
        .select('email, user_name, band_id, registered_at')
        .in('band_id', senderBandIds)
        .not('email', 'is', null)
        .order('registered_at', { ascending: false })

      const latestPerBand: Record<string, any> = {}
      ;(latestRegs || []).forEach((r: any) => {
        if (!latestPerBand[r.band_id]) latestPerBand[r.band_id] = r
      })

      Object.values(latestPerBand).forEach((r: any) => {
        if (r.email !== senderEmail && !networkEmails.find(e => e.email === r.email)) {
          networkEmails.push({ email: r.email, name: r.user_name || 'Friend', relationship: 'received your band', bandId: r.band_id })
        }
      })
    }

    // Filter out excluded emails
    const recipients = networkEmails.filter(r => !excludedEmails.includes(r.email))

    if (recipients.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No contacts found in your network yet. Share bands with people to build your prayer network.' })
    }

    // Save prayer request first to get ID
    const { data: chainPrayer } = await supabase
      .from('chain_prayers')
      .insert({
        band_id: senderBandIds[0] || null,
        prayer_text: prayerText,
        sender_contact: senderEmail,
        sender_contact_type: 'email',
        targets: recipients.map(r => ({ email: r.email, name: r.name })),
        requester_user_id: userId,
        requester_name: senderName,
      })
      .select()
      .single()

    const chainPrayerId = chainPrayer?.id

    // Send emails with acknowledge link
    let sent = 0
    for (const recipient of recipients) {
      const ackUrl = `https://prayerbands.com/pray-ack?id=${chainPrayerId}&name=${encodeURIComponent(recipient.name)}&email=${encodeURIComponent(recipient.email)}`

      await resend.emails.send({
        from: 'PrayerBands <bands@prayerbands.com>',
        to: [recipient.email],
        subject: `🙏 ${senderName} is asking for prayer`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
            <div style="background:#1a6
