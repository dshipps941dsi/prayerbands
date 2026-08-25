'use client'

import { useState, useEffect } from 'react'

// A mini store on the band page: pick a theme or a colour, see the band image
// (tap to expand), choose a size and quantity, and add it to a cart. Mix styles
// and sizes, then send the whole cart to Stripe. A per-band dedication is added
// after purchase via the shipping email; subscriptions link out to /subscribe.

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
type Group = 'all' | 'design' | 'color'
type CartItem = { key: string; slug: string; name: string; size: string | null; qty: number; price: number }

export default function PurchaseTab({ bandId }: { bandId: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [group, setGroup] = useState<Group>('all')
  const [slug, setSlug] = useState<string | null>(null)
  const [size, setSize] = useState('M')
  const [qty, setQty] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState<string | null>(null)
  const [failed, setFailed] = useState<Set<string>>(new Set())

  const imgOf = (p: Product) => (p.images || []).find(u => /^https?:\/\//.test(u)) || p.images?.[0] || ''

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
      const bands: Product[] = (Array.isArray(d.products) ? d.products : []).filter((p: any) => p.category === 'band')
      setProducts(bands)
    }).catch(() => {})
  }, [])

  // A solid-colour band carries no artwork (theme 'default'); everything else is a themed design.
  const isColor = (p: Product) => !p.theme || p.theme === 'default'
  const inGroup = products.filter(p => group === 'all' ? true : group === 'color' ? isColor(p) : !isColor(p))

  useEffect(() => {
    if (inGroup.length === 0) { setSlug(null); return }
    if (!inGroup.some(p => p.slug === slug)) {
      const firstP = inGroup.find(p => p.slug === 'standard') || inGroup[0]
      setSlug(firstP.slug)
      if (firstP.hasSizes && !firstP.sizes.includes(size)) setSize(firstP.sizes.includes('M') ? 'M' : (firstP.sizes[0] || 'M'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, products])

  const selected = products.find(p => p.slug === slug) || null
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const cartTotal = cart.reduce((s, c) => s + c.qty * c.price, 0)

  function addToCart() {
    if (!selected) return
    const sz = selected.hasSizes ? size : null
    const key = `${selected.slug}|${sz ?? ''}`
    setCart(prev => {
      const found = prev.find(c => c.key === key)
      if (found) return prev.map(c => c.key === key ? { ...c, qty: c.qty + qty } : c)
      return [...prev, { key, slug: selected.slug, name: selected.name, size: sz, qty, price: selected.price }]
    })
    setQty(1)
  }
  const removeItem = (key: string) => setCart(prev => prev.filter(c => c.key !== key))
  const setItemQty = (key: string, q: number) => setCart(prev => prev.map(c => c.key === key ? { ...c, qty: Math.max(1, q) } : c))

  async function checkout() {
    if (!cart.length) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(c => ({ id: c.slug, qty: c.qty, size: c.size || undefined })),
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
  const stepBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${BORDER}`, background: SURFACE, color: DARK, fontSize: 17, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }

  return (
    <div style={{ padding: '24px 20px 40px' }}>
      <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: DARK, marginBottom: 4 }}>Send a Prayer Band</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 18, lineHeight: 1.5 }}>
        Keep the chain going — build a little order and send it to those on your heart.
      </div>

      {/* Theme vs Colour */}
      <div style={{ display: 'flex', gap: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {([['all', 'All'], ['design', 'Theme'], ['color', 'Color']] as const).map(([id, label]) => {
          const on = group === id
          return (
            <button key={id} onClick={() => setGroup(id)}
              style={{ flex: 1, padding: '9px 4px', border: 'none', borderRadius: 9, background: on ? GOLD : 'transparent', color: on ? INK : GRAY, fontSize: 12, fontWeight: on ? 700 : 500, fontFamily: serif, letterSpacing: '0.04em', cursor: 'pointer' }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Style tiles */}
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
        <div style={{ marginBottom: 16 }}>
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

      {/* Quantity + add to cart */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: GRAY, fontFamily: 'Georgia, serif' }}>Quantity</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Fewer" style={{ ...stepBtn, fontSize: 20 }}>−</button>
          <span style={{ minWidth: 22, textAlign: 'center', fontFamily: serif, fontSize: 17, fontWeight: 700, color: DARK }}>{qty}</span>
          <button onClick={() => setQty(q => Math.min(20, q + 1))} aria-label="More" style={stepBtn}>+</button>
        </div>
      </div>

      <button onClick={addToCart} disabled={!selected} style={{ width: '100%', backgroundColor: 'transparent', color: DARK, border: `1.5px solid ${GOLD}`, borderRadius: 10, padding: 12, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: selected ? 'pointer' : 'default', opacity: selected ? 1 : 0.5 }}>
        {selected ? `+ Add ${qty > 1 ? `${qty} ` : ''}${selected.name}${qty > 1 ? ' bands' : ''} to cart` : '+ Add to cart'}
      </button>

      {/* Cart */}
      {cart.length > 0 && (
        <div style={{ marginTop: 20, background: SURFACE, border: `1px solid ${GOLD}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 10 }}>Your order</div>
          {cart.map(c => (
            <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${BORDER}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: serif, fontSize: 14, fontWeight: 700, color: DARK }}>{c.name}{c.size ? ` · ${c.size}` : ''}</div>
                <div style={{ fontSize: 12, color: GRAY }}>${c.price.toFixed(2)} each</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setItemQty(c.key, c.qty - 1)} aria-label="Fewer" style={{ ...stepBtn, width: 26, height: 26, fontSize: 16 }}>−</button>
                <span style={{ minWidth: 16, textAlign: 'center', fontFamily: serif, fontWeight: 700, color: DARK }}>{c.qty}</span>
                <button onClick={() => setItemQty(c.key, c.qty + 1)} aria-label="More" style={{ ...stepBtn, width: 26, height: 26, fontSize: 15 }}>+</button>
              </div>
              <button onClick={() => removeItem(c.key)} aria-label="Remove" style={{ background: 'none', border: 'none', color: GRAY, fontSize: 16, cursor: 'pointer', padding: 2 }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: 13, color: GRAY }}>{cartCount} {cartCount === 1 ? 'band' : 'bands'}</span>
            <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: DARK }}>${cartTotal.toFixed(2)}</span>
          </div>
          <button onClick={checkout} disabled={loading} style={{ width: '100%', marginTop: 12, backgroundColor: GOLD, color: INK, border: 'none', borderRadius: 10, padding: 14, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Starting checkout…' : `Check out · ${cartCount} ${cartCount === 1 ? 'band' : 'bands'} →`}
          </button>
          <div style={{ fontSize: 12, color: GRAY, textAlign: 'center', marginTop: 10, fontStyle: 'italic', fontFamily: 'Georgia, serif', lineHeight: 1.5 }}>
            You can add a private note or blessing for each band after you order — we&rsquo;ll email you a link.
          </div>
        </div>
      )}

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
