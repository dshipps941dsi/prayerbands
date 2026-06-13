'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'
import BandsManager from '../_components/BandsManager'
import ProductsManager from '../_components/ProductsManager'
import PricingManager from '../_components/PricingManager'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

const C = {
  pageBg: '#F6F1E4', navy: '#0A1628', gold: '#C8A96E', goldText: '#9A7A35',
  secondary: '#5C6573', heading: '#15223B', borderGold: 'rgba(200,169,110,0.34)',
}

type Sub = 'bands' | 'products' | 'pricing'

export default function AdminCatalog() {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sub, setSub] = useState<Sub>(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('tab')
      if (t === 'products' || t === 'pricing' || t === 'bands') return t
    }
    return 'bands'
  })

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.email !== ADMIN_EMAIL) { window.location.href = '/signin'; return }
      setAuthorized(true); setLoading(false)
    })
  }, [])

  if (loading || !authorized) return <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', color: C.secondary }}>Loading... ✝</div>

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: C.pageBg, minHeight: '100vh', padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}><PrayerBandsLogo size={34} color={C.gold} /></div>
          <a href="/admin" style={{ color: C.goldText, fontSize: 13, textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>← Admin</a>
          <h1 style={{ fontSize: 30, fontWeight: 600, marginTop: 8, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Band Management</h1>
          <p style={{ color: C.secondary, fontSize: 14 }}>Bands, products, and pricing — all in one place.</p>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.borderGold}`, marginBottom: 28 }}>
          {(['bands', 'products', 'pricing'] as const).map(t => (
            <button key={t} onClick={() => setSub(t)} style={{
              padding: '9px 20px',
              background: sub === t ? C.navy : 'transparent',
              color: sub === t ? C.gold : C.secondary,
              border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
              fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>{t}</button>
          ))}
        </div>

        {sub === 'bands' && <BandsManager />}
        {sub === 'products' && <ProductsManager />}
        {sub === 'pricing' && <PricingManager />}
      </div>
    </div>
  )
}
