'use client'

import { useState, useEffect } from 'react'

// A mini store on the band page: choose a style, size, and (for a custom band)
// a colour, add an optional dedication, and check out — no navigation away.
// Wired to the existing create-checkout route; styles/prices come from the
// admin-managed catalog. Subscriptions are intentionally a link out to the full
// /subscribe page rather than an inline card, to keep this focused on sending.

const GOLD = 'var(--pb-primary, #B8860B)'
const DARK = 'var(--pb-text, #2C1810)'
const GRAY = 'var(--pb-text-muted, #8B7355)'
const BORDER = 'var(--pb-border, #E8DCC8)'
const CREAM = 'var(--pb-background, #FAF6EF)'
const SURFACE = 'var(--pb-surface, #ffffff)'
const INK = 'var(--pb-text-on-primary, #0f0d09)'
const serif = 'Playfair Display, Georgia, serif'

const COLORS = [
  { name: 'Amber Gold', hex: '#C8A96E' },
  { name: 'Sage Green', hex: '#7BAE8E' },
  { name: 'Slate Blue', hex: '#7B8FAE' },
  { name: 'Burgundy', hex: '#AE7B7B' },
  { name: 'Midnight', hex: '#2C1A0E' },
  { name: 'Ivory', hex: '#F5EFE4' },
]
const SIZES = [
  { id: 'S', label: 'Small' },
  { id: 'M', label: 'Medium' },
  { id: 'L', label: 'Large' },
]

type Product = { slug: string; name: string; category: string; price: number; sizes: string[]; hasSizes: boolean }

export default function PurchaseTab({ bandId }: { bandId: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [slug, setSlug] = useState<string | null>(null)
  const [size, setSize] = useState('M')
  const [color, setColor] = useState(COLORS[0].name)
  const [showDedication, setShowDedication] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
      const bands: Product[] = (Array.isArray(d.products) ? d.products : []).filter((p: any) => p.category === 'band')
      setProducts(bands)
      // Default to Standard if present, else the first band.
      const std = bands.find(p => p.slug === 'standard') || bands[0]
      if (std) { setSlug(std.slug); if (std.hasSizes) setSize(std.sizes.includes('M') ? 'M' : (std.sizes[0] || 'M')) }
    }).catch(() => {})
  }, [])

  const selected = products.find(p => p.slug === slug) || null
  const isCustom = slug === 'custom'

  async function send() {
    if (!selected) return
    setLoading(true); setError('')
    try {
      const customMessage = recipient.trim()
        ? `For ${recipient.trim()}${note.trim() ? `: ${note.trim()}` : ''}`
        : note.trim()
      const res = await fetch('/api/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: selected.slug, qty: 1, size: selected.hasSizes ? size : undefined }],
          color: isCustom ? color : undefined,
          customMessage,
        }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      setError('Could not start checkout. Please try again.'); setLoading(false)
    } catch {
      setError('Something went wrong. Please try again.'); setLoading(false)
    }
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: GRAY, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: 'Georgia, serif', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, backgroundColor: CREAM, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ padding: '24px 20px 40px' }}>
      <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: DARK, marginBottom: 4 }}>Send a Prayer Band</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>
        Keep the chain going — pick a style and send one to someone on your heart.
      </div>

      {/* Style picker */}
      <label style={labelStyle}>Style</label>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, marginBottom: 18, scrollbarWidth: 'none' }}>
        {products.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Loading styles…</div>}
        {products.map(p => {
          const on = p.slug === slug
          return (
            <button key={p.slug} onClick={() => { setSlug(p.slug); if (p.hasSizes && !p.sizes.includes(size)) setSize(p.sizes[0] || 'M') }}
              style={{ flexShrink: 0, minWidth: 118, textAlign: 'left', background: on ? '#FFF8E7' : SURFACE, border: `1.5px solid ${on ? GOLD : BORDER}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ fontFamily: serif, fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 3 }}>{p.name}</div>
              <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: GOLD }}>${p.price.toFixed(2)}</div>
            </button>
          )
        })}
      </div>

      {/* Size */}
      {selected?.hasSizes && (
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Size</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {SIZES.filter(s => selected.sizes.includes(s.id)).map(s => {
              const on = size === s.id
              return (
                <button key={s.id} onClick={() => setSize(s.id)}
                  style={{ flex: 1, padding: '9px 6px', borderRadius: 9, border: `1.5px solid ${on ? GOLD : BORDER}`, background: on ? '#FFF8E7' : SURFACE, color: on ? DARK : GRAY, fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer' }}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Colour — custom band only */}
      {isCustom && (
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Colour</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {COLORS.map(c => {
              const on = color === c.name
              return (
                <button key={c.name} onClick={() => setColor(c.name)} title={c.name} aria-label={c.name}
                  style={{ width: 34, height: 34, borderRadius: '50%', background: c.hex, border: on ? `3px solid ${DARK}` : `2px solid ${BORDER}`, cursor: 'pointer', padding: 0 }} />
              )
            })}
          </div>
          <div style={{ fontSize: 12, color: GRAY, marginTop: 6 }}>{color}</div>
        </div>
      )}

      {/* Dedication */}
      {!showDedication ? (
        <button onClick={() => setShowDedication(true)} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 13, fontFamily: 'Georgia, serif', cursor: 'pointer', padding: '0 0 4px', textDecoration: 'underline' }}>
          + Add a dedication
        </button>
      ) : (
        <div style={{ marginBottom: 4 }}>
          <label style={labelStyle}>Who is this for?</label>
          <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Recipient's name" maxLength={80} style={{ ...inputStyle, marginBottom: 12 }} />
          <label style={labelStyle}>A note from you</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="A short message or prayer…" maxLength={200} rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
          <div style={{ fontSize: 11, color: '#B0A090', textAlign: 'right', marginTop: 4 }}>{note.length}/200</div>
        </div>
      )}

      <button onClick={send} disabled={loading || !selected} style={{ width: '100%', marginTop: 18, backgroundColor: selected ? GOLD : BORDER, color: INK, border: 'none', borderRadius: 10, padding: 14, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: loading || !selected ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Starting checkout…' : selected ? `Send this ${selected.name} — $${selected.price.toFixed(2)} →` : 'Send a band →'}
      </button>

      {error && <div style={{ color: '#C0392B', fontSize: 13, textAlign: 'center', marginTop: 14 }}>{error}</div>}

      {/* Subscription lives on its own page — a small link, not a big card. */}
      <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${BORDER}`, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: GRAY, marginBottom: 6, fontFamily: 'Georgia, serif' }}>Want a new band to give every month?</div>
        <a href="/subscribe" style={{ fontSize: 14, color: GOLD, fontFamily: serif, fontWeight: 700, textDecoration: 'none' }}>Become a monthly sender →</a>
      </div>

      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <a href="/register" style={{ fontSize: 13, color: GRAY, textDecoration: 'underline' }}>Already have a band to register?</a>
      </div>
    </div>
  )
}
