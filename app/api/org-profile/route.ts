'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function OrgDashboardInner() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'Overview'
  const [org, setOrg] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [bands, setBands] = useState<any[]>([])
  const [prayers, setPrayers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orderQty, setOrderQty] = useState(100)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Try URL param first, fall back to session
      const urlParams = new URLSearchParams(window.location.search)
      const uidFromUrl = urlParams.get('uid')
      
      let userId = uidFromUrl
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/signin'; return }
        userId = user.id
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, organizations(*)')
        .eq('id', userId)
        .maybeSingle()

      if (!profile?.org_id) { window.location.href = '/signin'; return }
      const orgData = (profile as any).organizations
      setOrg(orgData)

      const { data: statsData } = await supabase
        .rpc('get_org_stats', { org_uuid: profile.org_id })
      setStats(statsData)

      const { data: bandsData } = await supabase
        .from('bands')
        .select('band_id, status, created_at')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(50)
      setBands(bandsData || [])

      const { data: prayersData } = await supabase
        .from('registrations')
        .select('band_id, user_name, prayer, city, country, registered_at')
        .not('prayer', 'is', null)
        .order('registered_at', { ascending: false })
        .limit(20)
      setPrayers(prayersData || [])

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
      setOrders(ordersData || [])

      setLoading(false)
    }
    load()
