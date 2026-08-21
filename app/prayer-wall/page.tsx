'use client'
import { publicName } from '@/lib/public-name'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Logo from '@/components/Logo'
import SiteFooter from '@/components/SiteFooter'

type Prayer = {
  id: string
  prayer: string
  user_name?: string
  city?: string
  state?: string
  country?: string
  verse?: string
  registered_at: string
  isNetwork?: boolean
}

const FILTERS = ['All', 'Today', 'This Week', 'International'] as const
type Filter = typeof FILTERS[number]

const ACCENT_COLORS = ['#C8A96E', '#7BAE8E', '#7B8FAE', '#AE7B7B', '#B07BAE', '#6E8FAE']

export default function PrayerWallPage() {
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [networkPrayers, setNetworkPrayers] = useState<Prayer[]>([])
  const [filtered, setFiltered] = useState<Prayer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('All')
  const [toast, setToast] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 12

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const applyFilter = useCallback((data: Prayer[], f: Filter) => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000)
    switch (f) {
      case 'Today':
        return data.filter(p => new Date(p.registered_at) >= todayStart)
      case 'This Week':
        return data.filter(p => new Date(p.registered_at) >= weekStart)
      case 'International':
        return data.filter(p => p.country && !p.country.toLowerCase().includes('usa') && !p.country.toLowerCase().includes('united states'))
      default:
        return data
    }
  }, [])

  // Read through /api/wall-prayers rather than querying Supabase from here, so
  // names are shortened to a last initial on the server and full surnames never
  // reach the browser at all.
  const loadPrayers = useCallback(async (pageNum = 0) => {
    try {
      const res = await fetch(`/api/wall-prayers?page=${pageNum}&pageSize=${PAGE_SIZE}`)
      const json = await res.json()
      if (res.ok && Array.isArray(json.prayers)) {
        const incoming = json.prayers as Prayer[]
        const newPrayers = pageNum === 0 ? incoming : [...prayers, ...incoming]
        setPrayers(newPrayers)
        setFiltered(applyFilter(newPrayers, filter))
        setTotalCount(json.count || 0)
      }
    } catch {}
    setLoading(false)
  }, [filter, prayers, applyFilter])

  // A realtime INSERT payload carries the whole row, surname included, so we
  // throw it away and re-read the newest page through the API instead. Merging
  // by id keeps any extra pages the reader has already loaded.
  const refreshTop = useCallback(async () => {
    try {
      const res = await fetch(`/api/wall-prayers?page=0&pageSize=${PAGE_SIZE}`)
      const json = await res.json()
      if (!res.ok || !Array.isArray(json.prayers)) return
      setTotalCount(json.count || 0)
      setPrayers(prev => {
        const have = new Set(prev.map(p => p.id))
        const fresh = (json.prayers as Prayer[]).filter(p => !have.has(p.id))
        return fresh.length ? [...fresh, ...prev] : prev
      })
    } catch {}
  }, [])

  useEffect(() => {
    loadPrayers(0)
    // Public network requests (shown alongside band prayers).
    supabase
      .from('prayer_network_requests')
      .select('id, request_text, public_name, created_at')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setNetworkPrayers(data.map((r: any) => ({
            id: 'nr-' + r.id,
            prayer: r.request_text,
            user_name: r.public_name || 'Anonymous',
            registered_at: r.created_at,
            isNetwork: true,
          })))
        }
      })
    const channel = supabase
      .channel('prayer-wall')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registrations' }, () => {
        refreshTop()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const merged = [...networkPrayers, ...prayers].sort(
      (a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime()
    )
    setFiltered(applyFilter(merged, filter))
  }, [filter, prayers, networkPrayers, applyFilter])

  async function reportPrayer(id: string) {
    const reason = prompt('Why are you reporting this prayer? (optional)')
    if (reason === null) return
    const res = await fetch('/api/report-prayer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reason }),
    })
    if (res.ok) {
      setFiltered(prev => prev.filter(p => p.id !== id))
      setPrayers(prev => prev.filter(p => p.id !== id))
      showToast('Prayer reported — thank you for keeping the wall sacred ✝')
    } else {
      showToast('That report did not go through. Please try again.')
    }
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

  const getInitials = (prayer: Prayer) => {
    const name = prayer.user_name
    if (name) return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    return String(prayer.id).slice(-2).toUpperCase()
  }

  const getColor = (prayer: Prayer) => {
    const s = String(prayer.id)
    const idx = s.charCodeAt(s.length - 1) % ACCENT_COLORS.length
    return ACCENT_COLORS[idx]
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#F6F1E4', minHeight: '100vh', color: '#2A3344' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .cormorant { font-family: 'Cormorant Garamond', serif; }
        .inter { font-family: 'Inter', sans-serif; }
        .prayer-card { background: #FFFDF8; border: 1px solid rgba(10,22,40,0.12); border-radius: 10px; padding: 28px; transition: transform 0.2s, box-shadow 0.2s; break-inside: avoid; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(10,22,40,0.06); }
        .prayer-card:hover { transform: translateY(-3px); box-shadow: 0 10px 36px rgba(10,22,40,0.10); }
        .filter-btn { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; padding: 8px 18px; border-radius: 40px; border: 1px solid rgba(92,101,115,0.20); background: transparent; cursor: pointer; transition: all 0.2s; color: #5C6573; white-space: nowrap; }
        .filter-btn.active { background: #0A1628; color: #F6F1E4; border-color: #0A1628; }
        .filter-btn:not(.active):hover { border-color: rgba(200,169,110,0.34); color: #9A7A35; }
        .submit-btn { font-family: 'Inter', sans-serif; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; padding: 14px 32px; background: #C8A96E; color: #0A1628; border: none; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
        .submit-btn:hover { background: #E2C98A; }
        .submit-btn:disabled { background: #C9CFD6; color: #5C6573; cursor: not-allowed; }
        input, textarea { width: 100%; padding: 12px 16px; border: 1px solid rgba(10,22,40,0.12); border-radius: 4px; background: #FFFDF8; font-family: 'Inter', sans-serif; font-size: 14px; color: #2A3344; outline: none; transition: border-color 0.2s; }
        input:focus, textarea:focus { border-color: rgba(200,169,110,0.34); box-shadow: 0 0 0 3px rgba(200,169,110,0.12); }
        textarea { resize: vertical; min-height: 100px; line-height: 1.7; }
        .toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: #0A1628; color: #F6F1E4; padding: 12px 28px; border-radius: 40px; font-family: 'Inter', sans-serif; font-size: 13px; letter-spacing: 0.06em; z-index: 999; animation: fadeUp 0.3s ease; pointer-events: none; }
        @keyframes fadeUp { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        .prayers-masonry { columns: 3; column-gap: 24px; }
        .load-more-btn { font-family: 'Inter', sans-serif; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; padding: 13px 40px; background: transparent; color: #9A7A35; border: 1.5px solid rgba(200,169,110,0.34); border-radius: 4px; cursor: pointer; transition: all 0.2s; }
        .load-more-btn:hover { background: #C8A96E; color: #0A1628; border-color: #C8A96E; }
        @media (max-width: 900px) { .prayers-masonry { columns: 2; } }
        @media (max-width: 600px) { .prayers-masonry { columns: 1; } .stats-row { flex-wrap: wrap !important; } }
      `}</style>

      {toast && <div className="toast">✝ {toast}</div>}

      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(246,241,228,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(10,22,40,0.12)', padding: '0 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Logo size={30} />
            <span className="cormorant" style={{ fontSize: 20, fontWeight: 600, color: '#15223B' }}>Prayer Bands</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="/store" className="inter" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5C6573', textDecoration: 'none' }}>Shop</a>
            <a href="/my-band" className="inter" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5C6573', textDecoration: 'none' }}>Dashboard</a>
            {/* Was "+ Leave a Prayer", which opened a form that let anyone
                write into any band's chain. A prayer belongs to a band somebody
                is actually holding, so the tap is the only way in now. */}
            <a href="/store" className="submit-btn" style={{ padding: '9px 20px', fontSize: 12, textDecoration: 'none', display: 'inline-block' }}>Get a Band</a>
          </div>
        </div>
      </nav>

      <section style={{ padding: '72px 32px 48px', textAlign: 'center', background: 'radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%), linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%)', borderBottom: '1px solid rgba(200,169,110,0.34)' }}>
        <span className="inter" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8A96E', display: 'block', marginBottom: 10 }}>Global Prayer Wall</span>
        <h1 className="cormorant" style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, lineHeight: 1.15, marginBottom: 16, color: '#F5EDD8' }}>
          Prayers Traveling<br /><em style={{ color: '#C8A96E' }}>the World</em>
        </h1>
        <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, #C8A96E, #E2C98A)', margin: '0 auto 20px' }} />
        <p className="inter" style={{ fontSize: 16, color: 'rgba(245,237,216,0.78)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.8, fontWeight: 300 }}>
          Every prayer below was left on a real band, in a real person's hands, somewhere in the world.
        </p>
        <div className="stats-row" style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {[
            { value: totalCount.toLocaleString(), label: 'Prayers' },
            { value: '23', label: 'Countries' },
            { value: '250', label: 'Bands Active' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '16px 24px', background: '#FFFDF8', border: '1px solid rgba(200,169,110,0.34)', borderRadius: 8 }}>
              {/* These boxes are cream, not navy like the band around them, so
                  the gold that reads well on the dark hero was landing at about
                  2:1 here — the headline numbers were nearly invisible. */}
              <div className="inter" style={{ fontSize: 30, fontWeight: 700, color: '#15223B', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div className="inter" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C6573', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ position: 'sticky', top: 64, zIndex: 90, background: 'rgba(236,238,241,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(92,101,115,0.20)', padding: '14px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="inter" style={{ fontSize: 12, color: '#5C6573', letterSpacing: '0.06em' }}>
            {filtered.length} prayer{filtered.length !== 1 ? 's' : ''} showing
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '48px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, color: '#C8A96E', marginBottom: 16 }}>✝</div>
            <div className="inter" style={{ fontSize: 13, fontWeight: 600, color: '#5C6573', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Loading prayers...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
            <h3 className="cormorant" style={{ fontSize: 28, marginBottom: 12, color: '#15223B' }}>No prayers yet</h3>
            <p className="inter" style={{ fontSize: 14, color: '#5C6573', marginBottom: 28, lineHeight: 1.7 }}>
              Prayers reach this wall by being left on a band. Tap one and the prayer you write travels with it.
            </p>
            <a href="/store" className="submit-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>Get a Band</a>
          </div>
        ) : (
          <>
            <div className="prayers-masonry">
              {filtered.map(prayer => {
                const color = getColor(prayer)
                const location = [prayer.city, prayer.state, prayer.country].filter(Boolean).join(', ')
                return (
                  <div key={prayer.id} className="prayer-card" style={{ borderTop: `3px solid ${color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="inter" style={{ fontSize: 13, color: '#0A1628', fontWeight: 700 }}>{getInitials(prayer)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Was Cinzel: inscriptional Roman capitals, a display
                            face, set at 11px in all-caps with wide tracking.
                            That is about the least readable way to render a
                            person's name. It is the name of whoever carried the
                            band, so it should read first and read plainly. */}
                        <div className="inter" style={{ fontSize: 15, color: '#15223B', fontWeight: 700, letterSpacing: '-0.01em' }}>
                          {publicName(prayer.user_name)}
                        </div>
                        {/* #9A7A35 on cream is about 3.8:1 — under the 4.5:1
                            small text needs. #7A5F26 is the same gold, darker. */}
                        {location && <div className="inter" style={{ fontSize: 12.5, color: '#7A5F26', marginTop: 2 }}>📍 {location}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {/* The band ID used to sit here. It is the key to the
                            band — it opens its page and the claim flow keys on
                            it — so it does not belong on a public page. */}
                        {prayer.isNetwork && (
                          <span className="inter" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: `${color}18`, color: '#5C6573', border: `1px solid ${color}55`, padding: '2px 8px', borderRadius: 20, display: 'block', marginBottom: 4 }}>Network</span>
                        )}
                        <span className="inter" style={{ fontSize: 12, color: '#5C6573' }}>{timeAgo(prayer.registered_at)}</span>
                      </div>
                    </div>
                    {/* Was Cormorant Garamond italic — a display serif, and a
                        light one. Prayers are the whole point of this page and
                        run to several lines, so they are body copy and want a
                        text face. The quote marks carry the quoted feeling that
                        the italic was doing, without costing legibility. */}
                    <p className="inter" style={{ fontSize: 16, lineHeight: 1.72, color: '#1E2736', fontWeight: 400 }}>&ldquo;{prayer.prayer}&rdquo;</p>
                    {prayer.verse && <div className="inter" style={{ fontSize: 12.5, color: '#7A5F26', marginTop: 10, fontWeight: 500 }}>📖 {prayer.verse}</div>}
                    {/* "See Band Journey" used to sit on the left of this row.
                        It led to a stranger's band and put its ID in the URL,
                        which is more of someone else's band than a passer-by
                        needs. Report is all that is left, so it sits right. */}
                    {!prayer.isNetwork && (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(10,22,40,0.08)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => reportPrayer(prayer.id)}
                          className="inter"
                          style={{fontSize:12,color:'#737D8C',background:'none',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',padding:0,transition:'color 0.2s'}}
                          onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.color='#B4441F'}
                          onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.color='#737D8C'}
                        >⚑ Report</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {prayers.length < totalCount && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <button className="load-more-btn" onClick={() => { const next = page + 1; setPage(next); loadPrayers(next) }}>Load More Prayers</button>
                <div className="inter" style={{ fontSize: 12, color: '#5C6573', marginTop: 12 }}>Showing {filtered.length} of {totalCount.toLocaleString()} prayers</div>
              </div>
            )}
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}