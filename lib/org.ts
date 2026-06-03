import { createClient } from '@supabase/supabase-js'

export async function getOrgBySubdomain(subdomain: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('subdomain', subdomain)
    .single()
  if (error) return null
  return data
}

export async function getOrgForUser(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('profiles')
    .select('org_id, organizations(*)')
    .eq('id', userId)
    .single()
  if (error) return null
  return (data as any)?.organizations || null
}

export async function getOrgStats(orgId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase.rpc('get_org_stats', { org_uuid: orgId })
  return data
}

export async function getOrgBands(orgId: string, limit = 50) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('bands')
    .select(`
      band_id, status, created_at,
      registrations (
        user_name, city, country, prayer, registered_at
      )
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getOrgPrayers(orgId: string, limit = 20) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('registrations')
    .select('band_id, user_name, prayer, city, country, registered_at')
    .not('prayer', 'is', null)
    .order('registered_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getOrgOrders(orgId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  return data || []
}
