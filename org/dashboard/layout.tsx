'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const NAV = ['Overview', 'Bands', 'Prayer Wall', 'Orders', 'Settings']

export default function OrgDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrg() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signin'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, organizations(*)')
        .eq('id', user.id)
        .single()

      if (!profile?.org_id) { router.push('/dashboard'); return }
      setOrg((profile as any).organizations)
      setLoading(false)
    }
    loadOrg()
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#f7f4ef',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif', color: '#8a7c6a', fontSize: 16,
    }}>
      Loading your ministry dashboard... ✝
    </div>
  )

  const activeNav = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('tab') || 'Overview'
    : 'Overview'

  function navigate(tab: string) {
    router.push(`/org/dashboard?tab=${tab}`)
  }

  const green = org?.color || '#1a6b4a'

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh', color: '#2c2416' }}>
      {/* Top bar */}
      <div style={{
        background: green, color: '#fff',
        display: 'flex', alignItems: 'center',
        padding: '0 32px', height: 56, gap: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
      }}>
        <span style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 1 }}>✝ PrayerBands</span>
        <span style={{
          background: 'rgba(255,255,255,0.18)', borderRadius: 4,
          padding: '2px 10px', fontSize: 12, letterSpacing: 1, fontFamily: 'monospace',
        }}>
          {org?.subdomain}.prayerbands.com
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={async () => {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )
            await supabase.auth.signOut()
            router.push('/signin')
          }}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', padding: '6px 14px', borderRadius: 6,
            cursor: 'pointer', fontSize: 13, fontFamily: 'Georgia, serif',
          }}
        >
          Sign out
        </button>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        {/* Sidebar */}
        <div style={{
          width: 220, background: '#fff',
          borderRight: '1px solid #e8e1d6',
          padding: '28px 0', display: 'flex',
          flexDirection: 'column', gap: 4, flexShrink: 0,
        }}>
          <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #e8e1d6' }}>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: green, lineHeight: 1.3 }}>
              {org?.name}
            </div>
            <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 4 }}>{org?.location}</div>
            <div style={{
              display: 'inline-block', marginTop: 8,
              background: '#e6f4ee', color: green,
              fontSize: 11, padding: '2px 8px', borderRadius: 12,
              fontFamily: 'monospace', letterSpacing: 0.5,
            }}>
              {org?.prefix}-XXXXX
            </div>
          </div>

          <div style={{ padding: '12px 0' }}>
            {NAV.map(item => (
              <div
                key={item}
                onClick={() => navigate(item)}
                style={{
                  padding: '10px 24px', cursor: 'pointer', fontSize: 14,
                  borderLeft: activeNav === item ? `3px solid ${green}` : '3px solid transparent',
                  color: activeNav === item ? green : '#5a4f42',
                  background: activeNav === item ? '#f0f7f3' : 'transparent',
                  fontWeight: activeNav === item ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {item}
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />
          <div style={{
            margin: 16,
            background: `linear-gradient(135deg, ${green}, #2d9966)`,
            color: '#fff', borderRadius: 8, padding: '12px 14px', fontSize: 12,
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{org?.plan || 'Ministry'} Plan</div>
            <div style={{ opacity: 0.8 }}>
              {org?.created_at ? `Since ${new Date(org.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: 32, maxWidth: 1100, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
