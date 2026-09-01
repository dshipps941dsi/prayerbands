import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Resolves "the band view" for the signed-in user and redirects there.
//
// The band page — daily verse, journey, prayers — is the everyday experience;
// /dashboard is the account-level overview. Navigation across the app used to
// default to /dashboard, dropping people out of the mobile view they actually
// live in. Everything now points here instead, and only the Account tab's
// "My Dashboard" link goes to /dashboard deliberately.
//
// A person can hold several bands, so pick the one they most recently touched:
// their latest registration, falling back to their most recently created owned
// band (a band bought or claimed but not yet registered).
export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Signed out — the band page can't be resolved, so send them to sign in and
  // come back here once they have a session.
  if (!user) {
    return NextResponse.redirect(`${origin}/signin?redirect=/my-band`, { status: 307 })
  }

  const admin = createServiceClient()

  // A band the user pinned as their default (Settings/star on the band header).
  // Honor it only while they still hold or own it, so a passed-on band doesn't
  // strand the app on a band they no longer have.
  const { data: prof } = await admin.from('profiles').select('default_band_id').eq('id', user.id).maybeSingle()
  const pinned = prof?.default_band_id
  if (pinned) {
    const [{ data: heldReg }, { data: ownedPin }] = await Promise.all([
      admin.from('registrations').select('band_id').eq('user_id', user.id).eq('band_id', pinned).limit(1).maybeSingle(),
      admin.from('bands').select('band_id').eq('owner_id', user.id).eq('band_id', pinned).limit(1).maybeSingle(),
    ])
    if (heldReg?.band_id || ownedPin?.band_id) {
      return NextResponse.redirect(`${origin}/band/${pinned}`, { status: 307 })
    }
  }

  const { data: latestReg } = await admin
    .from('registrations')
    .select('band_id')
    .eq('user_id', user.id)
    .order('registered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let bandId: string | null = latestReg?.band_id ?? null

  if (!bandId) {
    const { data: ownedBand } = await admin
      .from('bands')
      .select('band_id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    bandId = ownedBand?.band_id ?? null
  }

  // No band yet (e.g. an account made before a purchase) — the dashboard is the
  // only sensible landing place.
  if (!bandId) {
    return NextResponse.redirect(`${origin}/dashboard`, { status: 307 })
  }

  return NextResponse.redirect(`${origin}/band/${bandId}`, { status: 307 })
}
