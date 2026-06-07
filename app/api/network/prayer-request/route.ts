import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/network/prayer-request  { request_text }
// Share a prayer request with your accepted network.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { request_text } = await req.json()
    if (!request_text?.trim()) {
      return NextResponse.json({ error: 'Prayer request text is required' }, { status: 400 })
    }

    const { data: request, error } = await supabase
      .from('prayer_network_requests')
      .insert({ user_id: user.id, request_text: request_text.trim() })
      .select()
      .single()

    if (error || !request) {
      console.error('Network prayer request insert error:', error)
      return NextResponse.json({ error: 'Failed to share prayer request' }, { status: 500 })
    }

    return NextResponse.json({ request })
  } catch (err) {
    console.error('Network prayer request error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/network/prayer-request  { request_id, is_answered }
// Mark your own request answered / unanswered.
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { request_id, is_answered } = await req.json()
    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    // RLS ("manage their own") restricts this to the owner.
    const { data: updated, error } = await supabase
      .from('prayer_network_requests')
      .update({ is_answered, answered_at: is_answered ? new Date().toISOString() : null })
      .eq('id', request_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    return NextResponse.json({ request: updated })
  } catch (err) {
    console.error('Network prayer request PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/network/prayer-request?request_id=XXX
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const request_id = req.nextUrl.searchParams.get('request_id')
    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('prayer_network_requests')
      .delete()
      .eq('id', request_id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Network prayer request DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
