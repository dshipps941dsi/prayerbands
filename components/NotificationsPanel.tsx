'use client'

import { useState, useEffect, useCallback } from 'react'

// Self-contained notifications panel. Fetches the derived feed from
// /api/my-notifications, marks it seen on open, and supports quick-pray,
// dismiss, and widening the time window. Drop it anywhere and toggle `open`.

const NAVY = '#0A1628'
const GOLD = '#C8A96E'
const GOLD_TEXT = '#9A7A35'
const CARD = '#FFFDF8'
const BORDER = 'rgba(10,22,40,0.12)'
const GOLD_BORDER = 'rgba(200,169,110,0.5)'
const TEXT = '#15223B'
const BODY = '#2A3344'
const GRAY = '#5C6573'
const serif = 'Cormorant Garamond, Georgia, serif'
const cinzel = 'Cinzel, serif'
const sans = 'Inter, sans-serif'

const NOTIF_TIERS = [7, 30, 90, 0]

type Notif = {
  id: string
  type: string
  title: string
  detail?: string
  icon?: string
  band_id?: string
  ts: string
  requestId?: string
  circleId?: string
  shareUrl?: string
  shareText?: string
  ctaHref?: string
  ctaLabel?: string
}

function timeAgo(ts: string): string {
  if (!ts) return ''
  const then = new Date(ts).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}

export default function NotificationsPanel({
  open,
  onClose,
  userId,
  onSeen,
}: {
  open: boolean
  onClose: () => void
  userId?: string | null
  onSeen?: () => void
}) {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(7)
  // Timestamp the inbox was last seen, captured from the first open fetch (before
  // we mark it seen). "NEW" is derived per-item from ts > seenTs, so it stays
  // correct after dismissing or widening the window — unlike an index cutoff.
  const [seenTs, setSeenTs] = useState(0)
  const [prayed, setPrayed] = useState<Set<string>>(new Set())
  const [told, setTold] = useState<Set<string>>(new Set())
  const [loadingMore, setLoadingMore] = useState(false)
  const [shared, setShared] = useState(false)

  async function sharePromo(n: Notif) {
    const url = n.shareUrl || ''
    const text = n.shareText || url
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ text, url })
        return
      }
    } catch { /* user cancelled or unsupported — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch { /* clipboard blocked — nothing more we can do */ }
  }

  const fetchNotifs = useCallback(async (d: number) => {
    const res = await fetch(`/api/my-notifications?days=${d}`)
    if (!res.ok) return null
    return res.json()
  }, [])

  // On open: load the feed, then mark everything seen (clears the badge).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setDays(7)
    fetchNotifs(7).then(data => {
      if (cancelled || !data) { setLoading(false); return }
      setNotifs(data.notifications || [])
      setSeenTs(data.lastSeen || 0)
      setLoading(false)
      if ((data.unread || 0) > 0) {
        fetch('/api/my-notifications', { method: 'POST' }).catch(() => {})
        onSeen?.()
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function dismiss(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id))
    fetch('/api/my-notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', id }),
    }).catch(() => {})
  }

  function pray(requestId?: string) {
    if (!requestId || prayed.has(requestId)) return
    setPrayed(prev => new Set([...prev, requestId]))
    fetch('/api/prayer-requests/intercede', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, intercessorId: userId }),
    }).catch(() => {})
  }

  // After praying, let the requester see it in their inbox too (not just email).
  function letThemKnow(requestId?: string) {
    if (!requestId || told.has(requestId)) return
    setTold(prev => new Set([...prev, requestId]))
    fetch('/api/network/prayed-for', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    }).catch(() => {})
  }

  async function loadMore() {
    const idx = NOTIF_TIERS.indexOf(days)
    const next = NOTIF_TIERS[Math.min(idx + 1, NOTIF_TIERS.length - 1)]
    setLoadingMore(true)
    try {
      const data = await fetchNotifs(next)
      if (data) { setNotifs(data.notifications || []); setDays(data.days ?? next) }
    } finally { setLoadingMore(false) }
  }

  if (!open) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1099, background: 'rgba(10,22,40,0.15)' }} aria-hidden />
      <div
        role="dialog"
        aria-label="Notifications"
        style={{
          position: 'fixed', zIndex: 1100, top: 60, right: 8,
          width: 'min(380px, calc(100vw - 16px))', maxHeight: 'calc(100vh - 88px)',
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
          boxShadow: '0 16px 48px rgba(10,22,40,0.22)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: TEXT }}>Notifications</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 20, lineHeight: 1, color: GRAY, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 12 }}>
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: GRAY, fontSize: 14, fontFamily: sans }}>Loading…</div>
          ) : notifs.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: GRAY }}>
              <div style={{ fontSize: 30, marginBottom: 8, color: GOLD_TEXT }}>📖</div>
              <div style={{ fontSize: 13, fontFamily: sans }}>No notifications yet. As your band travels and orders ship, they’ll show up here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifs.map((n) => {
                const isPrayerLike = n.type === 'prayer' || n.type === 'prayer_request' || n.type === 'encouragement'
                const isNew = !!n.ts && new Date(n.ts).getTime() > seenTs
                const isPromo = n.type === 'promo'
                return (
                  <div key={n.id} style={{ background: isPromo ? 'linear-gradient(135deg, #FCF4E0, #F7E9C9)' : CARD, border: `1px solid ${isPromo || isNew ? GOLD_BORDER : BORDER}`, borderLeft: `3px solid ${isPromo || isNew ? GOLD : BORDER}`, borderRadius: 10, padding: '11px 13px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: isPromo ? GOLD : `${GOLD}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{n.icon || '✝︎'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: sans }}>
                        {n.title}
                        {isNew && <span style={{ marginLeft: 7, fontSize: 9, background: GOLD, color: NAVY, borderRadius: 8, padding: '1px 7px', fontFamily: cinzel, letterSpacing: '0.05em', verticalAlign: 'middle' }}>NEW</span>}
                      </div>
                      {n.detail && <div style={{ fontSize: 13, color: isPrayerLike ? BODY : GRAY, fontStyle: isPrayerLike ? 'italic' : 'normal', marginTop: 2, fontFamily: isPrayerLike ? serif : sans }}>{isPrayerLike ? `“${n.detail}”` : n.detail}</div>}
                      {n.band_id && <div style={{ fontSize: 11, color: GOLD_TEXT, fontFamily: 'monospace', marginTop: 3 }}>{n.band_id}</div>}
                      {(n.type === 'prayer_request' || n.type === 'circle_request' || n.type === 'promo' || (n.type === 'announcement' && n.ctaHref)) && (
                        <div style={{ marginTop: 9, display: 'flex', gap: 8 }}>
                          {n.type === 'prayer_request' && (
                            <button onClick={() => pray(n.requestId)} disabled={!!n.requestId && prayed.has(n.requestId)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: n.requestId && prayed.has(n.requestId) ? `${GOLD}22` : GOLD, color: n.requestId && prayed.has(n.requestId) ? GOLD_TEXT : NAVY, fontSize: 11, fontWeight: 700, cursor: n.requestId && prayed.has(n.requestId) ? 'default' : 'pointer', fontFamily: cinzel, letterSpacing: '0.04em' }}>{n.requestId && prayed.has(n.requestId) ? '✓ Prayed' : '🙏 Pray'}</button>
                          )}
                          {n.type === 'prayer_request' && n.requestId && prayed.has(n.requestId) && (
                            <button onClick={() => letThemKnow(n.requestId)} disabled={told.has(n.requestId)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${GOLD_BORDER}`, background: CARD, color: GOLD_TEXT, fontSize: 11, fontWeight: 700, cursor: told.has(n.requestId) ? 'default' : 'pointer', fontFamily: cinzel, letterSpacing: '0.04em' }}>{told.has(n.requestId) ? '✓ They know' : 'Let them know 🙏'}</button>
                          )}
                          {n.type === 'circle_request' && (
                            <a href={`/circles/${n.circleId}`} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${GOLD_BORDER}`, background: CARD, color: GOLD_TEXT, fontSize: 11, fontWeight: 700, textDecoration: 'none', fontFamily: cinzel, letterSpacing: '0.04em' }}>Open circle →</a>
                          )}
                          {n.type === 'promo' && (
                            <button onClick={() => sharePromo(n)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: GOLD, color: NAVY, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.04em' }}>{shared ? '✓ Copied' : 'Share your link'}</button>
                          )}
                          {n.type === 'announcement' && n.ctaHref && (
                            <a href={n.ctaHref} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: GOLD, color: NAVY, fontSize: 11, fontWeight: 700, textDecoration: 'none', fontFamily: cinzel, letterSpacing: '0.04em' }}>{n.ctaLabel || 'Open'} →</a>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: GRAY, fontFamily: sans, whiteSpace: 'nowrap' }}>{timeAgo(n.ts)}</div>
                      <button onClick={() => dismiss(n.id)} aria-label="Dismiss" title="Dismiss" style={{ background: 'none', border: 'none', color: GRAY, fontSize: 14, lineHeight: 1, cursor: 'pointer', padding: 2, opacity: 0.6 }}>✕</button>
                    </div>
                  </div>
                )
              })}
              {days !== 0 && (
                <button onClick={loadMore} disabled={loadingMore} style={{ marginTop: 4, alignSelf: 'center', background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 18px', fontSize: 12, color: GRAY, cursor: loadingMore ? 'wait' : 'pointer', fontFamily: cinzel, letterSpacing: '0.04em' }}>
                  {loadingMore ? 'Loading…' : days === 7 ? 'Load last 30 days' : days === 30 ? 'Load last 90 days' : 'Load all'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
