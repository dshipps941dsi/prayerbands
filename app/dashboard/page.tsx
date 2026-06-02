'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Band = {
  id: string
  band_id: string
  created_at: string
  registrations: { count: number }[]
  chain_prayers: { count: number }[]
}

type Activity = {
  id: string
  type: 'prayer' | 'registration'
  band_id: string
  message?: string
  location?: string
  created_at: string
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bands, setBands] = useState<Band[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [stats, setStats] = useState({ bands: 0, prayers: 0, registrations: 0, countries: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'bands' | 'activity'>('overview')

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/signin'; return }
      setUser(user)

      // Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      // Bands owned by user
      const { data: bandsData } = await supabase
        .from('bands')
        .select('id, band_id, created_at, registrations(count), chain_prayers(count)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      setBands((bandsData as Band[]) || [])

      // Recent prayers on user's bands
      const { data: prayers } = await supabase
        .from('chain_prayers')
        .select('id, band_id, message, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      // Recent registrations of user's bands
      const { data: regs } = await supabase
        .from('registrations')
        .select('id, band_id, location, created_at')
        .in('band_id', (bandsData || []).map((b: Band) => b.band_id))
        .order('created_at', { ascending: false })
        .limit(10)

      const activityItems: Activity[] = [
        ...((prayers || []).map((p: any) => ({ id: p.id, type: 'prayer' as const, band_id: p.band_id, message: p.message, created_at: p.created_at }))),
        ...((regs || []).map((r: any) => ({ id: r.id, type: 'registration' as const, band_id: r.band_id, location: r.location, created_at: r.created_at }))),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 12)
      setActivity(activityItems)

      // Stats
      const totalPrayers = (bandsData || []).reduce((sum: number, b: Band) => sum + (b.chain_prayers?.[0]?.count || 0), 0)
      const totalRegs = (bandsData || []).reduce((sum: number, b: Band) => sum + (b.registrations?.[0]?.count || 0), 0)
      setStats({
        bands: (bandsData || []).length,
        prayers: totalPrayers,
        registrations: totalRegs,
        countries: 0,
      })

      setLoading(false)
    }

    load()
  }, [])

  const signOut = async () => {
    const { createBrowserClient } = await import('@supabase/ssr')
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDFAF5', fontFamily: 'Georgia, serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, color: '#C8A96E', marginBottom: 16 }}>✝</div>
        <div style={{ fontFamily: 'Lato, sans-serif', fontSize: 14, color: '#9B7B62', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading your ministry...</div>
      </div>
    </div>
  )

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend'

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#FDFAF5', minHeight: '100vh', color: '#2C1A0E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .playfair { font-family: 'Playfair Display', serif; }
        .lato { font-family: 'Lato', sans-serif; }
        .stat-card {
          background: #fff; border: 1px solid #E8DFD0; border-radius: 10px;
          padding: 28px 24px; transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(44,26,14,0.08); }
        .band-row {
          background: #fff; border: 1px solid #E8DFD0; border-radius: 8px;
          padding: 18px 20px; display: flex; align-items: center; gap: 16px;
          transition: box-shadow 0.2s; cursor: pointer;
        }
        .band-row:hover { box-shadow: 0 4px 20px rgba(44,26,14,0.08); }
        .tab-btn {
          font-family: 'Lato', sans-serif; font-size: 12px; letter-spacing: 0.14em;
          text-transform: uppercase; padding: 8px 20px; border-radius: 4px;
          border: 1px solid #E8DFD0; background: transparent; cursor: pointer;
          transition: all 0.2s; color: #9B7B62;
        }
        .tab-btn.active { background: #2C1A0E; color: #FDFAF5; border-color: #2C1A0E; }
        .action-btn {
          display: flex; align-items: center; gap: 12; padding: 18px 20px;
          background: #fff; border: 1px solid #E8DFD0; border-radius: 8px;
          cursor: pointer; transition: all 0.2s; text-decoration: none; width: 100%;
        }
        .action-btn:hover { border-color: #C8A96E; box-shadow: 0 4px 20px rgba(200,169,110,0.15); }
        .activity-item {
          padding: 16px 0; border-bottom: 1px solid #F5EFE4;
          display: flex; align-items: flex-start; gap: 14;
        }
        .activity-item:last-child { border-bottom: none; }
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ background: '#2C1A0E', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C8A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>✝</div>
          <span className="playfair" style={{ fontSize: 18, fontWeight: 600, color: '#FDFAF5' }}>PrayerBands</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/store" style={{ fontFamily: 'Lato, sans-serif', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Store</a>
          <span style={{ fontFamily: 'Lato, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{user?.email}</span>
          <button onClick={signOut} style={{ fontFamily: 'Lato, sans-serif', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A96E', background: 'none', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '48px 32px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 48 }}>
          <span style={{ fontFamily: 'Lato, sans-serif', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A96E', display: 'block', marginBottom: 8 }}>Ministry Dashboard</span>
          <h1 className="playfair" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600 }}>
            Welcome back, <em style={{ color: '#C8A96E' }}>{firstName}</em>
          </h1>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
          {(['overview', 'bands', 'activity'] as const).map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'overview' ? '📊 Overview' : tab === 'bands' ? '🎗 My Bands' : '⚡ Activity'}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            {/* Stats */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 40 }}>
              {[
                { label: 'Bands Given', value: stats.bands, icon: '🎗', color: '#C8A96E' },
                { label: 'Prayers Left', value: stats.prayers, icon: '🙏', color: '#7BAE8E' },
                { label: 'Registrations', value: stats.registrations, icon: '✦', color: '#7B8FAE' },
                { label: 'Countries', value: stats.countries || '—', icon: '🌍', color: '#AE7B7B' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                  <div className="playfair" style={{ fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div className="lato" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9B7B62', marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              {/* Quick Actions */}
              <div>
                <h2 className="playfair" style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Quick Actions</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { icon: '✝', label: 'Register a Band', desc: 'Activate a new PrayerBand', href: '/register', color: '#C8A96E' },
                    { icon: '🙏', label: 'Leave a Prayer', desc: 'Pray for a band in your chain', href: '/prayer-wall', color: '#7BAE8E' },
                    { icon: '🛒', label: 'Order More Bands', desc: 'Individual or church packs', href: '/store', color: '#7B8FAE' },
                  ].map(action => (
                    <a key={action.label} href={action.href} className="action-btn" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: '#fff', border: '1px solid #E8DFD0', borderRadius: 8, textDecoration: 'none', transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = action.color; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E8DFD0'; }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${action.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{action.icon}</div>
                      <div>
                        <div className="playfair" style={{ fontSize: 16, fontWeight: 600, color: '#2C1A0E' }}>{action.label}</div>
                        <div className="lato" style={{ fontSize: 13, color: '#9B7B62', marginTop: 2, fontWeight: 300 }}>{action.desc}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', color: '#C8B49A', fontSize: 18 }}>→</div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h2 className="playfair" style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Recent Activity</h2>
                <div style={{ background: '#fff', border: '1px solid #E8DFD0', borderRadius: 10, padding: '8px 20px' }}>
                  {activity.length === 0 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
                      <p className="lato" style={{ fontSize: 14, color: '#9B7B62', fontWeight: 300 }}>No activity yet — register your first band to get started.</p>
                    </div>
                  ) : activity.slice(0, 6).map(item => (
                    <div key={item.id} className="activity-item">
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: item.type === 'prayer' ? '#7BAE8E18' : '#C8A96E18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                        {item.type === 'prayer' ? '🙏' : '✦'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="lato" style={{ fontSize: 13, fontWeight: 700, color: '#2C1A0E' }}>
                          {item.type === 'prayer' ? 'Prayer left' : 'Band registered'} · <span style={{ color: '#C8A96E' }}>{item.band_id}</span>
                        </div>
                        {item.message && (
                          <div className="playfair" style={{ fontSize: 13, color: '#6B4C35', fontStyle: 'italic', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{item.message}"</div>
                        )}
                        {item.location && (
                          <div className="lato" style={{ fontSize: 12, color: '#9B7B62', marginTop: 2 }}>📍 {item.location}</div>
                        )}
                      </div>
                      <div className="lato" style={{ fontSize: 11, color: '#C8B49A', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── BANDS TAB ── */}
        {activeTab === 'bands' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 className="playfair" style={{ fontSize: 26, fontWeight: 600 }}>My Bands</h2>
              <a href="/register" style={{ fontFamily: 'Lato, sans-serif', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#C8A96E', color: '#fff', padding: '9px 20px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}>+ Register Band</a>
            </div>

            {bands.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🎗</div>
                <h3 className="playfair" style={{ fontSize: 22, marginBottom: 12 }}>No bands yet</h3>
                <p className="lato" style={{ fontSize: 14, color: '#9B7B62', fontWeight: 300, marginBottom: 24 }}>Register your first band or order new ones from the store.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <a href="/register" style={{ fontFamily: 'Lato, sans-serif', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#C8A96E', color: '#fff', padding: '12px 28px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}>Register a Band</a>
                  <a href="/store" style={{ fontFamily: 'Lato, sans-serif', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: '#C8A96E', border: '1.5px solid #C8A96E', padding: '12px 28px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}>Order Bands</a>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {bands.map(band => (
                  <a key={band.id} href={`/band/${band.band_id}`} style={{ textDecoration: 'none' }}>
                    <div className="band-row">
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#C8A96E18', border: '2px solid #C8A96E44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✝</div>
                      <div style={{ flex: 1 }}>
                        <div className="playfair" style={{ fontSize: 18, fontWeight: 600, color: '#C8A96E' }}>{band.band_id}</div>
                        <div className="lato" style={{ fontSize: 12, color: '#9B7B62', marginTop: 2 }}>
                          Registered {new Date(band.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 24, marginRight: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div className="playfair" style={{ fontSize: 20, fontWeight: 700, color: '#7BAE8E' }}>{band.chain_prayers?.[0]?.count || 0}</div>
                          <div className="lato" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B7B62' }}>Prayers</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div className="playfair" style={{ fontSize: 20, fontWeight: 700, color: '#7B8FAE' }}>{band.registrations?.[0]?.count || 0}</div>
                          <div className="lato" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B7B62' }}>Hands</div>
                        </div>
                      </div>
                      <div style={{ color: '#C8B49A', fontSize: 18 }}>→</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
        {activeTab === 'activity' && (
          <div>
            <h2 className="playfair" style={{ fontSize: 26, fontWeight: 600, marginBottom: 24 }}>All Activity</h2>
            <div style={{ background: '#fff', border: '1px solid #E8DFD0', borderRadius: 10, padding: '8px 24px' }}>
              {activity.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <p className="lato" style={{ fontSize: 14, color: '#9B7B62', fontWeight: 300 }}>No activity yet.</p>
                </div>
              ) : activity.map(item => (
                <div key={item.id} className="activity-item">
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: item.type === 'prayer' ? '#7BAE8E18' : '#C8A96E18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {item.type === 'prayer' ? '🙏' : '✦'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="lato" style={{ fontSize: 14, fontWeight: 700 }}>
                      {item.type === 'prayer' ? 'Prayer left on' : 'Band registered'} · <span style={{ color: '#C8A96E' }}>{item.band_id}</span>
                    </div>
                    {item.message && (
                      <div className="playfair" style={{ fontSize: 14, color: '#6B4C35', fontStyle: 'italic', marginTop: 4 }}>"{item.message}"</div>
                    )}
                    {item.location && (
                      <div className="lato" style={{ fontSize: 13, color: '#9B7B62', marginTop: 3 }}>📍 {item.location}</div>
                    )}
                  </div>
                  <div className="lato" style={{ fontSize: 12, color: '#C8B49A', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}