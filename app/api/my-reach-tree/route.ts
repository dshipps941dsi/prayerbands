import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nameFromProfile } from '@/lib/network'

// The viewer's whole sponsorship tree — everyone a band reached, branching out
// generation by generation — for the animated reach web. Parent links come from
// profiles.upline_user_id (first-wins sponsorship), which is exactly what
// downline_of traverses.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ root: null, nodes: [], total: 0, direct: 0 })

  const admin = createServiceClient()
  const { data: rows, error } = await admin.rpc('downline_of', { root: user.id, max_depth: null })
  if (error) return NextResponse.json({ error: 'Could not load your reach.' }, { status: 500 })

  const downline = (rows ?? []) as { user_id: string; depth: number }[]
  const depthById = new Map(downline.map(d => [d.user_id, d.depth]))
  const ids = downline.map(d => d.user_id)

  // Names + parents for the downline, and the root's own name.
  const [{ data: profs }, { data: rootProf }] = await Promise.all([
    ids.length ? admin.from('profiles').select('id, full_name, email, upline_user_id').in('id', ids) : Promise.resolve({ data: [] as any[] }),
    admin.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
  ])

  const nodes = (profs ?? []).map((p: any) => ({
    id: p.id as string,
    name: nameFromProfile(p),
    // A parent that isn't in the downline (or is the root) attaches to the root.
    parent: (p.upline_user_id && depthById.has(p.upline_user_id)) ? p.upline_user_id as string : user.id,
    depth: depthById.get(p.id) ?? 1,
  }))

  return NextResponse.json({
    root: { id: user.id, name: nameFromProfile(rootProf) },
    nodes,
    total: ids.length,
    direct: downline.filter(d => d.depth === 1).length,
    generations: downline.reduce((m, d) => Math.max(m, d.depth), 0),
  })
}
