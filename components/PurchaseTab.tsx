'use client'

import { useState, useEffect } from 'react'

// A mini store on the band page: pick a design or a solid colour, see the band
// image (tap to expand), choose a size, add an optional dedication, and check
// out inline. Styles/prices/images come from the admin catalog. Subscriptions
// are a link out to /subscribe to keep this focused on sending one now.

const GOLD = 'var(--pb-primary, #B8860B)'
const DARK = 'var(--pb-text, #2C1810)'
const GRAY = 'var(--pb-text-muted, #8B7355)'
const BORDER = 'var(--pb-border, #E8DCC8)'
const CREAM = 'var(--pb-background, #FAF6EF)'
const SURFACE = 'var(--pb-surface, #ffffff)'
const INK = 'var(--pb-text-on-primary, #0f0d09)'
const serif = 'Playfair Display, Georgia, serif'

const SIZES = [
  { id: 'S', label: 'Small' },
  { id: 'M', label: 'Medium' },
  { id: 'L', label: 'Large' },
]

type Product = { slug: string; name: string; category: string; theme: string; price: number; sizes: string[]; hasSizes: boolean; images: string[] }
type Group = 'design' | 'color'

export default function PurchaseTab({ bandId }: { bandId: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [group, setGroup] = useState<Group>('design')
  const [slug, setSlug] = useState<string | null>(null)
  const [size, setSize] = useState('M')
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState<string | null>(null)
  const [failed, setFailed] = useState<Set<string>>(new Set())

  // Prefer a real (absolute) image URL — some catalog rows list a relative path
  // first that isn't in /public (e.g. Mountains), which renders blank.
  const imgOf = (p: Product) => (p.images || []).find(u => /^https?:\/\//.test(u)) || p.images?.[0] || ''

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
      const bands: Product[] = (Array.isArray(d.products) ? d.products : []).filter((p: any) => p.category === 'band')
      setProducts(bands)
    }).catch(() => {})
  }, [])

  // A solid-colour band carries no design (theme 'default'); everything else is a design.
  const isColor = (p: Product) => !p.theme || p.theme === 'default'
  const inGroup = products.filter(p => group === 'color' ? isColor(p) : !isColor(p))

  // Keep a valid selection whenever the group changes.
  useEffect(() => {
    if (inGroup.length === 0) { setSlug(null); return }
    if (!inGroup.some(p => p.slug === slug)) {
      const first = inGroup.find(p => p.slug === 'standard') || inGroup[0]
      setSlug(first.slug)
      if (first.hasSizes && !first.sizes.includes(size)) setSize(first.sizes.includes('M') ? 'M' : (first.sizes[0] || 'M'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, products])

  const selected = products.find(p => p.slug === slug) || null

  async function send() {
    if (!selected) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: selected.slug, qty, size: selected.hasSizes ? size : undefined }],
          returnTo: `/band/${bandId}`,
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

  return (
    <div style={{ padding: '24px 20px 40px' }}>
      <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: DARK, marginBottom: 4 }}>Send a Prayer Band</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 18, lineHeight: 1.5 }}>
        Keep the chain going — choose a look and send one to someone on your heart.
      </div>

      {/* Design vs Solid colour */}
      <div style={{ display: 'flex', gap: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {([['design', 'Designs'], ['color', 'Solid Colors']] as const).map(([id, label]) => {
          const on = group === id
          return (
            <button key={id} onClick={() => setGroup(id)}
              style={{ flex: 1, padding: '9px 4px', border: 'none', borderRadius: 9, background: on ? GOLD : 'transparent', color: on ? INK : GRAY, fontSize: 12, fontWeight: on ? 700 : 500, fontFamily: serif, letterSpacing: '0.04em', cursor: 'pointer' }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Style tiles with a band image */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {products.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Loading styles…</div>}
        {inGroup.map(p => {
          const on = p.slug === slug
          const img = imgOf(p)
          const broken = !img || failed.has(img)
          return (
            <div key={p.slug} onClick={() => { setSlug(p.slug); if (p.hasSizes && !p.sizes.includes(size)) setSize(p.sizes[0] || 'M') }}
              style={{ background: on ? '#FFF8E7' : SURFACE, border: `1.5px solid ${on ? GOLD : BORDER}`, borderRadius: 12, padding: 8, cursor: 'pointer' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', background: CREAM, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!broken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={p.name} onError={() => setFailed(prev => new Set(prev).add(img))} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6, boxSizing: 'border-box' }} />
                ) : (
                  <div style={{ fontSize: 28, color: GRAY }}>✝</div>
                )}
                {!broken && (
                  <button onClick={e => { e.stopPropagation(); setZoom(img) }} aria-label="View larger"
                    style={{ position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(10,10,15,0.5)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                  </button>
                )}
              </div>
              <div style={{ fontFamily: serif, fontSize: 13.5, fontWeight: 700, color: DARK, lineHeight: 1.2 }}>{p.name}</div>
              <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: GOLD, marginTop: 2 }}>${p.price.toFixed(2)}</div>
            </div>
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

      {/* A private dedication for each band is added after purchase, via a link
          in the shipping email — so multi-band orders get a note per band. */}
      <div style={{ fontSize: 12.5, color: GRAY, fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.5 }}>
        You can add a private note or blessing for each band after you order — we&rsquo;ll email you a link.
      </div>

      {/* Quantity */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
        <span style={{ fontSize: 13, color: GRAY, fontFamily: 'Georgia, serif' }}>How many?</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Fewer" style={{ width: 34, height: 34, borderRadius: '50%', border: `1.5px solid ${BORDER}`, background: SURFACE, color: DARK, fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>−</button>
          <span style={{ minWidth: 22, textAlign: 'center', fontFamily: serif, fontSize: 17, fontWeight: 700, color: DARK }}>{qty}</span>
          <button onClick={() => setQty(q => Math.min(20, q + 1))} aria-label="More" style={{ width: 34, height: 34, borderRadius: '50%', border: `1.5px solid ${BORDER}`, background: SURFACE, color: DARK, fontSize: 18, lineHeight: 1, cursor: 'pointer' }}>+</button>
        </div>
      </div>

      <button onClick={send} disabled={loading || !selected} style={{ width: '100%', marginTop: 14, backgroundColor: selected ? GOLD : BORDER, color: INK, border: 'none', borderRadius: 10, padding: 14, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: loading || !selected ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Starting checkout…'
          : !selected ? 'Send a band →'
          : qty > 1 ? `Send ${qty} ${selected.name} bands → `
          : `Send a ${selected.name} band → `}
      </button>
      {selected && <div style={{ textAlign: 'center', fontSize: 12.5, color: GRAY, marginTop: 8 }}>${(selected.price * qty).toFixed(2)}{qty > 1 ? ` for ${qty}` : ''}</div>}

      {error && <div style={{ color: '#C0392B', fontSize: 13, textAlign: 'center', marginTop: 14 }}>{error}</div>}

      {/* Subscription lives on its own page — a small link, not a big card. */}
      <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${BORDER}`, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: GRAY, marginBottom: 6, fontFamily: 'Georgia, serif' }}>Want a new band to give every month?</div>
        <a href="/subscribe" style={{ fontSize: 14, color: GOLD, fontFamily: serif, fontWeight: 700, textDecoration: 'none' }}>Become a monthly sender →</a>
      </div>

      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <a href="/register" style={{ fontSize: 13, color: GRAY, textDecoration: 'underline' }}>Already have a band to register?</a>
      </div>

      {/* Image lightbox */}
      {zoom && (
        <div onClick={() => setZoom(null)} role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,10,15,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Band design" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, objectFit: 'contain' }} />
          <button onClick={() => setZoom(null)} aria-label="Close"
            style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 14px)', right: 16, width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
      )}
    </div>
  )
}
