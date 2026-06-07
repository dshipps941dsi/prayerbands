import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')?.toUpperCase().trim()

    if (!code) {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: circle, error } = await supabase
      .from('prayer_circles')
      .select(`
        id,
        name,
        description,
        join_code,
        is_closed,
        created_at,
        created_by
      `)
      .eq('join_code', code)
      .eq('is_closed', false)
      .single()

    if (error || !circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 })
    }

    // Get member count
    const { count } = await supabase
      .from('circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circle.id)

    return NextResponse.json({
      circle: {
        ...circle,
        member_count: count ?? 0
      }
    })
  } catch (err) {
    console.error('Circle lookup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
