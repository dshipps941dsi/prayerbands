'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

// "Ask a question" — the help assistant. One box, a few example questions,
// and an answer with a button to the right page. Inline on the FAQ page;
// a bottom sheet inside the app.

const GOLD = 'var(--pb-primary, #B8860B)'
const DARK = 'var(--pb-text, #2C1810)'
const GRAY = 'var(--pb-text-muted, #8B7355)'
const BORDER = 'var(--pb-border, #E8DCC8)'
const CREAM = 'var(--pb-background, #FAF6EF)'
const BLUE = '#2F5D9E'
const serif = 'Playfair Display, Georgia, serif'
const body = 'Lato, Georgia, serif'

const EXAMPLES = [
  'How do I order bands?',
  'What is a prayer circle?',
  'Help me connect a prayer partner',
  'How do I give my band to someone?',
  'What is the prayer journal?',
]

type Turn = { q: string; a?: string; link?: { label: string; href: string } | null; error?: string }

export function HelpBox({ place, autoFocus = false }: { place: 'app' | 'site'; autoFocus?: boolean }) {
  const [q, setQ] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [turns])

  async function ask(text: string) {
    const question = text.trim()
    if (!question || busy) return
    setQ('')
    setBusy(true)
    setTurns(prev => [...prev, { q: question }])
    try {
      const res = await fetch('/api/help', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, place }) })
      const d = await res.json().catch(() => ({}))
      setTurns(prev => prev.map((t, i) => i === prev.length - 1 ? { ...t, a: res.ok ? d.answer : undefined, link: res.ok ? d.link : null, error: res.ok ? undefined : (d.error || 'Something went wrong. Try again.') } : t))
    } catch {
      setTurns(prev => prev.map((t, i) => i === prev.length - 1 ? { ...t, error: 'No connection. Try again in a moment.' } : t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {turns.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {EXAMPLES.map(e => (
            <button key={e} onClick={() => ask(e)} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '7px 12px', fontFamily: body, fontSize: 12.5, color: DARK, cursor: 'pointer' }}>{e}</button>
          ))}
        </div>
      )}

      {turns.map((t, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: '85%', background: `color-mix(in srgb, ${GOLD} 14%, #fff)`, border: `1px solid color-mix(in srgb, ${GOLD} 35%, #fff)`, borderRadius: '14px 14px 4px 14px', padding: '9px 13px', fontFamily: body, fontSize: 14, color: DARK, lineHeight: 1.5 }}>{t.q}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
            <div style={{ maxWidth: '92%', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '14px 14px 14px 4px', padding: '11px 14px', fontFamily: body, fontSize: 14.5, color: DARK, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {t.error ? <span style={{ color: '#B4441F' }}>{t.error}</span>
                : t.a === undefined ? <span style={{ color: GRAY, fontStyle: 'italic' }}>Thinking…</span>
                : <>
                    {t.a}
                    {t.link && (
                      <div style={{ marginTop: 10 }}>
                        <a href={t.link.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: BLUE, color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '9px 14px', fontFamily: body, fontSize: 13, fontWeight: 700 }}>{t.link.label} →</a>
                      </div>
                    )}
                  </>}
            </div>
          </div>
        </div>
      ))}
      <div ref={endRef} />

      <form onSubmit={e => { e.preventDefault(); ask(q) }} style={{ display: 'flex', gap: 8, marginTop: turns.length ? 4 : 0 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value.slice(0, 500))}
          autoFocus={autoFocus}
          placeholder="Ask anything about Prayer Bands…"
          aria-label="Ask a question"
          style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', fontFamily: body, fontSize: 15, color: DARK, outline: 'none' }}
        />
        <button type="submit" disabled={busy || !q.trim()} style={{ flexShrink: 0, background: q.trim() && !busy ? GOLD : BORDER, color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: q.trim() && !busy ? 'pointer' : 'default' }}>Ask</button>
      </form>
      <div style={{ fontFamily: body, fontSize: 11.5, color: GRAY, marginTop: 8, lineHeight: 1.5 }}>
        Answers come from our help guide. Nothing you type here is tied to your account. For orders or anything personal, use the <a href="/contact" style={{ color: GRAY }}>contact form</a>.
      </div>
    </div>
  )
}

// The in-app bottom sheet.
export default function HelpSheet({ open, onClose, place = 'app' }: { open: boolean; onClose: () => void; place?: 'app' | 'site' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.4)', zIndex: 250, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Help" style={{ background: CREAM, borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', width: '100%', boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(44,24,16,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 12, right: 14, width: 34, height: 34, borderRadius: 17, border: 'none', background: 'rgba(44,24,16,0.08)', color: DARK, fontSize: 16, cursor: 'pointer' }}>✕</button>
        <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: DARK, marginBottom: 4 }}>How can we help?</div>
        <div style={{ fontFamily: body, fontSize: 13.5, color: GRAY, marginBottom: 14, lineHeight: 1.5 }}>Ask how something works, or how to do it.</div>
        <HelpBox place={place} autoFocus />
      </div>
    </div>
  )
}

// A floating "?" that appears once the page has been scrolled a little, and
// opens the sheet. Mounted once in the root layout; sits above the app's tab
// bar on band pages and hides on admin and sign-in screens.
export function HelpBubble() {
  const path = usePathname() || ''
  const [shown, setShown] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 160)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (/^\/(admin|fulfill|signin|auth|onboard|org|unavailable)/.test(path)) return null
  const inApp = /^\/(band\/|my-band|circles\/|circle\/)/.test(path)
  const visible = shown || open
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Help: ask a question"
        title="Ask a question"
        style={{
          position: 'fixed', right: 16, bottom: inApp ? 'calc(78px + env(safe-area-inset-bottom))' : 'calc(20px + env(safe-area-inset-bottom))', zIndex: 240,
          width: 48, height: 48, borderRadius: 24, border: 'none', cursor: 'pointer',
          background: GOLD, color: '#fff', boxShadow: '0 4px 14px rgba(44,24,16,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.6)', pointerEvents: visible ? 'auto' : 'none',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.4A8 8 0 1 1 21 12z" />
          <path d="M9.6 9.5a2.4 2.4 0 1 1 3.4 2.2c-.7.3-1 .8-1 1.5" />
          <circle cx="12" cy="16.4" r="0.6" fill="currentColor" />
        </svg>
      </button>
      <HelpSheet open={open} onClose={() => setOpen(false)} place={inApp ? 'app' : 'site'} />
    </>
  )
}
