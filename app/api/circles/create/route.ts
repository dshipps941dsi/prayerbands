import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function generateJoinCode(): string {
  // Exclude 0, O, I, 1 to avoid confusion
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user is a band holder. A holder either OWNS a band
    // (bands.owner_id — purchasers) OR has REGISTERED one (registrations.user_id
    // — anyone who claimed/holds a band). Service-role so RLS doesn't interfere.
    const admin = createServiceClient()
    const { data: ownedBands } = await admin
      .from('bands')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
    const { data: registeredBands } = await admin
      .from('registrations')
      .select('id, band_id')
      .eq('user_id', user.id)
      .limit(1)

    const ownsBand = !!(ownedBands && ownedBands.length)
    const hasRegistration = !!(registeredBands && registeredBands.length)

    if (!ownsBand && !hasRegistration) {
      return NextResponse.json(
        { error: 'You must be a band holder to create a Prayer Circle' },
        { status: 403 }
      )
    }

    // Numeric bands.id to record which band qualified them (nullable metadata).
    let qualifyingBandId: number | null = ownsBand ? (ownedBands![0].id as number) : null
    if (qualifyingBandId === null && hasRegistration && registeredBands![0].band_id) {
      const { data: regBand } = await admin
        .from('bands')
        .select('id')
        .eq('band_id', registeredBands![0].band_id)
        .maybeSingle()
      qualifyingBandId = (regBand?.id as number) ?? null
    }

    const { name, description } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Circle name is required' }, { status: 400 })
    }

    // Generate a unique join code. Use the service client so the uniqueness
    // check sees all codes (incl. closed circles), unaffected by RLS.
    let join_code = ''
    let attempts = 0
    while (attempts < 10) {
      const candidate = generateJoinCode()
      const { data: existing } = await admin
        .from('prayer_circles')
        .select('id')
        .eq('join_code', candidate)
        .maybeSingle()
      if (!existing) {
        join_code = candidate
        break
      }
      attempts++
    }

    if (!join_code) {
      return NextResponse.json({ error: 'Could not generate a unique code, please try again' }, { status: 500 })
    }

    // Create the circle with the service client (the user is already verified
    // above; created_by is set server-side, so this is safe and bypasses any
    // RLS-on-insert pitfalls — matching how the rest of the app does writes).
    const { data: circle, error: circleError } = await admin
      .from('prayer_circles')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        join_code,
        created_by: user.id,
        qualifying_band_id: qualifyingBandId
      })
      .select()
      .single()

    if (circleError || !circle) {
      console.error('Circle creation error:', circleError)
      return NextResponse.json({ error: 'Failed to create circle', details: circleError?.message }, { status: 500 })
    }

    // Auto-join creator as leader
    const { error: memberError } = await admin
      .from('circle_members')
      .insert({
        circle_id: circle.id,
        user_id: user.id,
        role: 'leader'
      })

    if (memberError) {
      console.error('Leader membership error:', memberError)
      // Circle was created — don't fail the whole request
    }

    return NextResponse.json({ circle })
  } catch (err) {
    console.error('Circle create error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
