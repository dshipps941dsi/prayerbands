import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/link/capture-google-email
// Called after an Apple-only user links their Google account. Apple sign-in
// often hands us a throwaway @privaterelay.appleid.com address; once Google is
// linked we have the person's real, durable email. Copy it onto their profile
// so notifications and network matching use a reachable address — but only when
// we don't already hold a real one (empty or an Apple relay), never clobbering
// a genuine address they already had.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceClient()
  const { data: full } = await svc.auth.admin.getUserById(user.id)
  const identities = full?.user?.identities || []
  const google = identities.find(i => i.provider === 'google')
  const googleEmail = ((google?.identity_data?.email as string | undefined) || '').toLowerCase().trim()
  if (!googleEmail) return NextResponse.json({ ok: false, reason: 'no-google' })

  const { data: prof } = await svc.from('profiles').select('email').eq('id', user.id).maybeSingle()
  const current = (prof?.email || '').toLowerCase()
  const shouldSet = !current || current.endsWith('@privaterelay.appleid.com')
  if (shouldSet && current !== googleEmail) {
    await svc.from('profiles').update({ email: googleEmail }).eq('id', user.id)
  }
  return NextResponse.json({ ok: true, updated: shouldSet && current !== googleEmail })
}
