import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Verify user owns at least one registered band
    const { data: band } = await supabase
      .from('bands')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single()

    if (!band) {
      return NextResponse.json(
        { error: 'You must be a band holder to create a Prayer Circle' },
        { status: 403 }
      )
    }

    const { name, description } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Circle name is required' }, { status: 400 })
    }

    // Generate a unique join code
    let join_code = ''
    let attempts = 0
    while (attempts < 10) {
      const candidate = generateJoinCode()
      const { data: existing } = await supabase
        .from('prayer_circles')
        .select('id')
        .eq('join_code', candidate)
        .single()
      if (!existing) {
        join_code = candidate
        break
      }
      attempts++
    }

    if (!join_code) {
      return NextResponse.json({ error: 'Could not generate a unique code, please try again' }, { status: 500 })
    }

    // Create the circle
    const { data: circle, error: circleError } = await supabase
      .from('prayer_circles')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        join_code,
        created_by: user.id,
        qualifying_band_id: band.id
      })
      .select()
      .single()

    if (circleError || !circle) {
      console.error('Circle creation error:', circleError)
      return NextResponse.json({ error: 'Failed to create circle' }, { status: 500 })
    }

    // Auto-join creator as leader
    const { error: memberError } = await supabase
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
