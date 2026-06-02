'use client'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Prayer = {
  id: string
  band_id: string
  prayer: string
  user_name?: string
  city?: string
  state?: string
  country?: string
  verse?: string
  registered_at: string
}

const FILTERS = ['All', 'Today', 'This Week', 'International'] as const
type Filter = typeof FILTERS[number]

const ACCENT_COLORS = ['#C8A96E', '#7BAE8E', '#7B8FAE', '#AE7B7B', '#B07BAE', '#6E8FAE']

export default function PrayerWallPage() {
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [filtered, setFiltered] = useState<Prayer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('All')
  const [showForm, setShowForm] = useState(false)
  const [bandId, setBandId] = useState('')
  const [message, setMessage] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
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

  const loadPrayers = useCallback(async (pageNum = 0) => {
    const from = pageNum * PAGE_SIZE
    const { data, error, count } = await supabase
      .from('registrations')
      .select('id, band_id, prayer, user_name, city, state, country, verse, registered_at', { count: 'exact' })
      .not('prayer', 'is', null)
      .neq('prayer', '')
      .order('registered_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (!error && data) {
      const newPrayers = pageNum === 0 ? (data as Prayer[]) : [...prayers, ...(data as Prayer[])]
      setPrayers(newPrayers)
      setFiltered(applyFilter(newPrayers, f => f === filter ? f : filter))
      setTotalCount(count || 0)
    }
    setLoading(false)
  }, [filter, prayers, applyFilter])

  useEffect(() => {
    loadPrayers(0)

    const channel = supabase
      .channel('prayer-wall')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registrations' }, payload => {
        const newPrayer = payload.new as Prayer
        if (newPrayer.prayer) {
          setPrayers(prev => [newPrayer, ...prev])
          setFiltered(prev => [newPrayer, ...prev])
          setTotalCount(c => c + 1)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    setFiltered(applyFilter(prayers, filter))
  }, [filter, prayers, applyFilter])

  const submitPrayer = async () => {
    if (!message.trim()) { showToast('Please write a prayer first'); return }
    if (!bandId.trim()) { showToast('Please enter a band ID'); return }
    setSubmitting(true)
    const { error } = await supabase.from('registrations').insert({
      band_id: bandId.trim().toUpperCase(),
      prayer: message.trim(),
      user_name: 'Anonymous',
      city: location.trim() || null,
    })
    setSubmitting(false)
    if (error) { showToast('Something went wrong — please try again'); return }
    setBandId('')
    setMessage('')
    setLocation('')
    setShowForm(false)
    showToast('Your prayer has been added to the wall ✝')
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
    return prayer.band_id.slice(-2).toUpperCase()
  }

  const getColor = (prayer: Prayer) => {
    const idx = prayer.band_id.charCodeAt(prayer.band_id.length - 1) % ACCENT_COLORS.length
    return ACCENT_COLORS[idx]
  }

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#FDFAF5', minHeight: '100vh', color: '#2C1A0E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .playfair { font-family: 'Playfair Display', serif; }
        .lato { font-family: 'Lato', sans-serif; }
        .prayer-card { background: #fff; border: 1px solid #E8DFD0; border-radius: 10px; padding: 28px; transition: transform 0.2s, box-shadow 0.2s; break-inside: avoid; margin-bottom: 20px; }
        .prayer-card:hover { transform: translateY(-3px); box-shadow: 0 10px 36px rgba(44,26,14,0.09); }
        .filter-btn { font-family: 'Lato', sans-serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; padding: 8px 18px; border-radius: 40px; border: 1px solid #E8DFD0; background: transparent; cursor: pointer; transition: all 0.2s; color: #9B7B62; white-space: nowrap; }
        .filter-btn.active { background: #2C1A0E; color: #FDFAF5; border-color: #2C1A0E; }
        .filter-btn:not(.active):hover { border-color: #C8A96E; color: #C8A96E; }
        .submit-btn { font-family: 'Lato', sans-serif; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; padding: 14px 32px; background: #C8A96E; color: #fff; border: none; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
        .submit-btn:hover { background: #B8944A; }
        .submit-btn:disabled { background: #C8B49A; cursor: not-allowed; }
        input, textarea { width: 100%; padding: 12px 16px; border: 1px solid #E8DFD0; border-radius: 4px; background: #FDFAF5; font-family: 'Lato', sans-serif; font-size: 14px; color: #2C1A0E; outline: none; transition: border-color 0.2s; }
        input:focus, textarea:focus { border-color: #C8A96E; }
        textarea { resize: vertical; min-height: 100px; line-height: 1.7; }
        .toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: #2C1A0E; color: #FDFAF5; padding: 12px 28px; border-radius: 40px; font-family: 'Lato', sans-serif; font-size: 13px; letter-spacing: 0.08em; z-index: 999; animation: fadeUp 0.3s ease; pointer-events: none; }
        @keyframes fadeUp { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        .prayers-masonry { columns: 3; column-gap: 24px; }
        .load-more-btn { font-family: 'Lato', sans-serif; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; padding: 13px 40px; background: transparent; color: #C8A96E; border: 1.5px solid #C8A96E; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
        .load-more-btn:hover { background: #C8A96E; color: #fff; }
        @media (max-width: 900px) { .prayers-masonry { columns: 2; } }
        @media (max-width: 600px) { .prayers-masonry { columns: 1; } .stats-row { flex-wrap: wrap !important; } }
      `}</style>

      {toast && <div className="toast">✝ {toast}</div>}

      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(253,250,245,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E8DFD0', padding: '0 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C8A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>✝</div>
            <span className="playfair" style={{ fontSize: 18, fontWeight: 600, color: '#2C1A0E' }}>PrayerBands</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="/shop" className="lato" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B7B62', textDecoration: 'none' }}>Shop</a>
            <a href="/dashboard" className="lato" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B7B62', textDecoration: 'none' }}>Dashboard</a>
            <button onClick={() => setShowForm(true)} className="submit-btn" style={{ padding: '9px 20px', fontSize: 12 }}>+ Leave a Prayer</button>
          </div>
        </div>
      </nav>

      <section style={{ padding: '72px 32px 48px', textAlign: 'center', background: 'linear-gradient(180deg, #F5EFE4 0%, #FDFAF5 100%)', borderBottom: '1px solid #E8DFD0' }}>
        <span className="lato" style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A96E', display: 'block', marginBottom: 10 }}>Global Prayer Wall</span>
        <h1 className="playfair" style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, lineHeight: 1.15, marginBottom: 16 }}>
          Prayers Traveling<br /><em style={{ color: '#C8A96E' }}>the World</em>
        </h1>
        <div style={{ width: 48, height: 2, background: '#C8A96E', margin: '0 auto 20px' }} />
        <p className="lato" style={{ fontSize: 16, color: '#6B4C35', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.8, fontWeight: 300 }}>
          Every prayer below was left on a real band, in a real person's hands, somewhere in the world.
        </p>
        <div className="stats-row" style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {[
            { value: totalCount.toLocaleString(), label: 'Prayers' },
            { value: '23', label: 'Countries' },
            { value: '250', label: 'Bands Active' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div className="playfair" style={{ fontSize: 32, fontWeight: 700, color: '#C8A96E' }}>{s.value}</div>
              <div className="lato" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9B7B62', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ position: 'sticky', top: 64, zIndex: 90, background: 'rgba(253,250,245,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8DFD0', padding: '14px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="lato" style={{ fontSize: 12, color: '#9B7B62', letterSpacing: '0.08em' }}>
            {filtered.length} prayer{filtered.length !== 1 ? 's' : ''} showing
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '48px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, color: '#C8A96E', marginBottom: 16 }}>✝</div>
            <div className="lato" style={{ fontSize: 14, color: '#9B7B62', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading prayers...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
            <h3 className="playfair" style={{ fontSize: 24, marginBottom: 12 }}>No prayers yet</h3>
            <p className="lato" style={{ fontSize: 14, color: '#9B7B62', fontWeight: 300, marginBottom: 28 }}>Be the first to leave a prayer on the wall.</p>
            <button className="submit-btn" onClick={() => setShowForm(true)}>Leave the First Prayer</button>
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
                        <span className="lato" style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{getInitials(prayer)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="lato" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9B7B62' }}>
                          {prayer.user_name || 'Anonymous'}
                        </div>
                        {location && <div className="lato" style={{ fontSize: 12, color: '#C8B49A', marginTop: 1 }}>📍 {location}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span className="lato" style={{ fontSize: 10, letterSpacing: '0.15em', background: `${color}18`, color, border: `1px solid ${color}44`, padding: '2px 8px', borderRadius: 20, display: 'block', marginBottom: 4 }}>{prayer.band_id}</span>
                        <span className="lato" style={{ fontSize: 11, color: '#C8B49A' }}>{timeAgo(prayer.registered_at)}</span>
                      </div>
                    </div>
                    <p className="playfair" style={{ fontSize: 15, lineHeight: 1.85, color: '#4A2E1A', fontStyle: 'italic' }}>"{prayer.prayer}"</p>
                    {prayer.verse && <div className="lato" style={{ fontSize: 12, color: '#7BAE8E', marginTop: 10, fontWeight: 700 }}>📖 {prayer.verse}</div>}
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F5EFE4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <a href={`/band/${prayer.band_id}`} className="lato" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B7B62', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = color}
                        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#9B7B62'}
                      >See Band Journey →</a>
                      <div className="lato" style={{ fontSize: 11, color: '#C8A96E' }}>🙏 Pray Along</div>
                    </div>
                  </div>
                )
              })}
            </div>
            {filtered.length < totalCount && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <button className="load-more-btn" onClick={() => { const next = page + 1; setPage(next); loadPrayers(next) }}>Load More Prayers</button>
                <div className="lato" style={{ fontSize: 12, color: '#C8B49A', marginTop: 12 }}>Showing {filtered.length} of {totalCount.toLocaleString()} prayers</div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,14,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: '#FDFAF5', borderRadius: 12, padding: '44px 40px', maxWidth: 520, width: '100%', boxShadow: '0 24px 80px rgba(44,26,14,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <span className="lato" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C8A96E', display: 'block', marginBottom: 6 }}>Leave a Prayer</span>
                <h2 className="playfair" style={{ fontSize: 28, fontWeight: 600 }}>Add to the Wall</h2>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9B7B62', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="lato" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9B7B62', display: 'block', marginBottom: 6 }}>Band ID *</label>
                <input placeholder="e.g. PB-K7M2R" value={bandId} onChange={e => setBandId(e.target.value)} />
              </div>
              <div>
                <label className="lato" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9B7B62', display: 'block', marginBottom: 6 }}>Your Prayer *</label>
                <textarea placeholder="Write your prayer for whoever holds this band..." value={message} onChange={e => setMessage(e.target.value)} />
              </div>
              <div>
                <label className="lato" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9B7B62', display: 'block', marginBottom: 6 }}>Your Location (optional)</label>
                <input placeholder="e.g. Nashville, TN" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button className="submit-btn" style={{ flex: 1 }} disabled={submitting} onClick={submitPrayer}>
                {submitting ? 'Sending...' : '✝ Leave My Prayer'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '14px 20px', background: 'transparent', border: '1px solid #E8DFD0', borderRadius: 4, cursor: 'pointer', fontFamily: 'Lato, sans-serif', fontSize: 13, color: '#9B7B62' }}>Cancel</button>
            </div>
            <p className="lato" style={{ fontSize: 12, color: '#C8B49A', marginTop: 14, textAlign: 'center', lineHeight: 1.6 }}>Your prayer will appear publicly on the wall. No account required.</p>
          </div>
        </div>
      )}
    </div>
  )
}