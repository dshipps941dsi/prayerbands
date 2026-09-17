import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import CircleStandalone from './CircleStandalone'

// /circles/[id] used to be its own page with a different feel from the app.
// Circles now live inside the band view, so anyone who holds a band is sent
// there, straight to this circle. Only people the app cannot show — guests
// with an invite code, members without a band — get the room on its own.
export default async function CirclePage({ params, searchParams }: {
  params: Promise<{ circleId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { circleId } = await params
  const sp = await searchParams
  const code = typeof sp.code === 'string' ? sp.code.trim().toUpperCase().slice(0, 12) : ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const admin = createServiceClient()
    const [{ data: reg }, { data: owned }] = await Promise.all([
      admin.from('registrations').select('band_id').eq('user_id', user.id).limit(1).maybeSingle(),
      admin.from('bands').select('band_id').eq('owner_id', user.id).limit(1).maybeSingle(),
    ])
    if (reg?.band_id || owned?.band_id) {
      redirect(`/my-band?open=circles&circle=${encodeURIComponent(circleId)}${code ? `&code=${encodeURIComponent(code)}` : ''}`)
    }
  }

  return <CircleStandalone circleId={circleId} code={code || null} />
}
