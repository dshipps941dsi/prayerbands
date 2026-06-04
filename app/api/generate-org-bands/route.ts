import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin() {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authed.auth.getUser()
  return !!user && user.email === ADMIN_EMAIL
}

const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateId(prefix: string, length = 5): string {
  let id = ''
  for (let i = 0; i < length; i++) {
    id += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
  }
  return `${prefix}-${id}`
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  try {
    const { org_id, quantity } = await req.json()
    if (!org_id || !quantity) {
      return NextResponse.json({ error: 'Missing org_id or quantity' }, { status: 400 })
    }

    // Get org
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', org_id)
      .single()
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

    // Get existing band IDs to avoid duplicates
    const { data: existing } = await supabase
      .from('bands')
      .select('band_id')
      .eq('org_id', org_id)
    const existingIds = new Set((existing || []).map((b: any) => b.band_id))

    // Generate unique IDs
    const bands = []
    const attempts = quantity * 10
    let generated = 0
    for (let i = 0; i < attempts && generated < quantity; i++) {
      const id = generateId(org.prefix)
      if (!existingIds.has(id)) {
        existingIds.add(id)
        bands.push({
          band_id: id,
          org_id,
          status: 'unregistered',
          nfc_url: `https://prayerbands.com/r/${id}`,
          outside_text: 'PrayerBands.com ✝',
          inside_text: id,
          batch: `${org.prefix}-BATCH-${new Date().toISOString().slice(0, 10)}`,
        })
        generated++
      }
    }

    // Insert into Supabase
    const { error } = await supabase.from('bands').insert(bands)
    if (error) throw error

    // Build supplier CSV content
    const csvRows = [
      ['sequence', 'band_id', 'nfc_url', 'outside_text', 'inside_text'],
      ...bands.map((b, i) => [
        i + 1,
        b.band_id,
        b.nfc_url,
        b.outside_text,
        b.inside_text,
      ])
    ]
    const csv = csvRows.map(r => r.join(',')).join('\n')

    // Send supplier CSV to admin email
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'PrayerBands <bands@prayerbands.com>',
      to: ['dshipps941@gmail.com'],
      subject: `✝ ${org.name} — ${quantity} Band IDs Generated (${org.prefix})`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="color:#1a6b4a">Band IDs Generated ✝</h2>
          <p><strong>Church:</strong> ${org.name}</p>
          <p><strong>Prefix:</strong> ${org.prefix}</p>
          <p><strong>Quantity:</strong> ${quantity}</p>
          <p><strong>Batch:</strong> ${bands[0]?.batch}</p>
          <p>The supplier NFC programming CSV is attached. Send to your band manufacturer.</p>
          <p style="font-size:12px;color:#888">All ${quantity} bands have been seeded into Supabase automatically.</p>
        </div>
      `,
      attachments: [
        {
          filename: `${org.prefix}_supplier_nfc_${new Date().toISOString().slice(0, 10)}.csv`,
          content: Buffer.from(csv).toString('base64'),
        }
      ]
    })

    return NextResponse.json({
      success: true,
      count: bands.length,
      prefix: org.prefix,
      batch: bands[0]?.batch,
      sample: bands.slice(0, 5).map(b => b.band_id),
    })

  } catch (err: any) {
    console.error('Generate bands error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
