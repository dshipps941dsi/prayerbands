'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'
import { THEME_OPTIONS } from '@/lib/themes'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

// PrayerBands brand palette
const C = {
  pageBg: '#F6F1E4',
  card: '#FFFDF8',
  navy: '#0A1628',
  gold: '#C8A96E',
  goldText: '#9A7A35',
  silver: '#C9CFD6',
  silverBg: '#ECEEF1',
  heading: '#15223B',
  body: '#2A3344',
  secondary: '#5C6573',
  borderGold: 'rgba(200,169,110,0.34)',
  borderNavy: 'rgba(10,22,40,0.12)',
  borderSilver: 'rgba(92,101,115,0.20)',
  green: '#4A8A6A',
  red: '#c0392b',
}

type Variant = { size: string; stock: number; backorder: boolean }
type P = {
  id: string; slug: string; name: string; description: string; category: string;
  theme: string; color: string; icon: string; tag: string | null;
  price_cents: number; bands_per_unit: number;
  features: string[]; sizes: string[]; has_sizes: boolean; multi_discount: boolean;
  image_urls: string[]; active: boolean; sort_order: number;
  variants: Variant[];
}

export default function AdminProducts() {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<P[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newName, setNewName] = useState('')

  function load() {
    fetch('/api/admin/products').then(r => r.json()).then(d => {
      if (!d.products) return
      const merged: P[] = d.products.map((p: any) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : [],
        sizes: Array.isArray(p.sizes) ? p.sizes : [],
        image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
        variants: (d.variants || []).filter((v: any) => v.product_id === p.id).map((v: any) => ({ size: v.size, stock: v.stock, backorder: v.backorder })),
      }))
      setProducts(merged)
    })
  }

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.email !== ADMIN_EMAIL) { window.location.href = '/signin'; return }
      setAuthorized(true); setLoading(false); load()
    })
  }, [])

  function edit(id: string, patch: Partial<P>) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }
  function editVariant(id: string, size: string, patch: Partial<Variant>) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, variants: p.variants.map(v => v.size === size ? { ...v, ...patch } : v) } : p))
  }
  function toggleSize(p: P, size: string) {
    const has = p.sizes.includes(size)
    const sizes = has ? p.sizes.filter(s => s !== size) : [...p.sizes, size].sort()
    edit(p.id, { sizes, has_sizes: sizes.length > 0 })
  }

  async function save(p: P) {
    setSavingId(p.id); setMsg('')
    const res = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: p.id, name: p.name, description: p.description, category: p.category,
        theme: p.theme, color: p.color, icon: p.icon, tag: p.tag,
        price_cents: p.price_cents, bands_per_unit: p.bands_per_unit,
        features: p.features, sizes: p.sizes, has_sizes: p.has_sizes, multi_discount: p.multi_discount,
        image_urls: p.image_urls, active: p.active, sort_order: p.sort_order,
        variants: p.variants,
      }),
    })
    const d = await res.json()
    setMsg(res.ok ? `✅ Saved ${p.name}.` : '❌ ' + (d.error || 'Save failed.'))
    setSavingId(null)
    if (res.ok) load()
  }

  async function addProduct() {
    if (!newSlug.trim() || !newName.trim()) return
    const res = await fetch('/api/admin/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: newSlug.trim().toLowerCase(), name: newName.trim(), category: 'band', has_sizes: true, sizes: ['S', 'M', 'L'], multi_discount: false, active: false, sort_order: products.length + 1 }),
    })
    const d = await res.json()
    if (res.ok) { setNewSlug(''); setNewName(''); setMsg(`✅ Created ${newName} (inactive — fill it in and activate).`); load() }
    else setMsg('❌ ' + (d.error || 'Create failed.'))
  }

  async function remove(p: P) {
    if (!confirm(`Delete ${p.name}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/products?id=${p.id}`, { method: 'DELETE' })
    if (res.ok) { setMsg(`🗑 Deleted ${p.name}.`); load() }
  }

  async function uploadImage(p: P, file: File) {
    const fd = new FormData(); fd.append('file', file); fd.append('slug', p.slug)
    const res = await fetch('/api/admin/product-image', { method: 'POST', body: fd })
    const d = await res.json()
    if (res.ok && d.url) { edit(p.id, { image_urls: [...p.image_urls, d.url] }); setMsg('✅ Image uploaded — Save to keep it.') }
    else setMsg('❌ ' + (d.error || 'Upload failed.'))
  }

  if (loading || !authorized) return <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', color: C.secondary }}>Loading... ✝</div>

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.goldText, display: 'block', marginBottom: 5, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${C.borderNavy}`, fontSize: 14, fontFamily: 'Inter, sans-serif', background: C.pageBg, color: C.body, boxSizing: 'border-box', outline: 'none' }
  const field = (l: string, node: React.ReactNode) => <div style={{ marginBottom: 12 }}><label style={label}>{l}</label>{node}</div>

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: C.pageBg, minHeight: '100vh', padding: 32 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}><PrayerBandsLogo size={34} color={C.gold} /></div>
          <a href="/admin" style={{ color: C.goldText, fontSize: 13, textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>← Admin</a>
          <h1 style={{ fontSize: 30, fontWeight: 600, marginTop: 8, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Products</h1>
          <p style={{ color: C.secondary, fontSize: 14 }}>Add band designs and packs, set prices, sizes, per-size stock, and backorder.</p>
        </div>

        {msg && <div style={{ marginBottom: 16, fontSize: 14, color: msg.startsWith('❌') ? C.red : C.green }}>{msg}</div>}

        {/* New product */}
        <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
          <div style={{ flex: 1, minWidth: 140 }}>{field('New product name', <input style={input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Beach Band" />)}</div>
          <div style={{ flex: 1, minWidth: 120 }}>{field('Slug (id)', <input style={input} value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="beach" />)}</div>
          <button onClick={addProduct} disabled={!newSlug.trim() || !newName.trim()} style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>+ Add</button>
        </div>

        {products.map(p => (
          <div key={p.id} style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '20px 22px', marginBottom: 20, opacity: p.active ? 1 : 0.7, boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{p.name} <span style={{ fontSize: 12, color: C.secondary, fontWeight: 400 }}>/{p.slug}</span></h2>
              <label style={{ fontSize: 13, color: C.body, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={p.active} onChange={e => edit(p.id, { active: e.target.checked })} style={{ width: 'auto' }} /> Active
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {field('Name', <input style={input} value={p.name} onChange={e => edit(p.id, { name: e.target.value })} />)}
              {field('Price ($)', <input style={input} type="number" step="0.01" value={(p.price_cents / 100).toString()} onChange={e => edit(p.id, { price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) })} />)}
              {field('Category', <select style={input} value={p.category} onChange={e => edit(p.id, { category: e.target.value })}><option value="band">band</option><option value="pack">pack</option></select>)}
              {field('Theme', <select style={input} value={p.theme} onChange={e => edit(p.id, { theme: e.target.value })}>{THEME_OPTIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>)}
              {field('Card color', <input style={input} value={p.color} onChange={e => edit(p.id, { color: e.target.value })} />)}
              {field('Badge / tag', <input style={input} value={p.tag || ''} onChange={e => edit(p.id, { tag: e.target.value })} placeholder="e.g. Most Popular" />)}
              {field('Bands per unit', <input style={input} type="number" value={p.bands_per_unit.toString()} onChange={e => edit(p.id, { bands_per_unit: parseInt(e.target.value) || 1 })} />)}
              {field('Sort order', <input style={input} type="number" value={p.sort_order.toString()} onChange={e => edit(p.id, { sort_order: parseInt(e.target.value) || 0 })} />)}
            </div>

            {field('Description', <textarea style={{ ...input, minHeight: 54 }} value={p.description} onChange={e => edit(p.id, { description: e.target.value })} />)}
            {field('Features (one per line)', <textarea style={{ ...input, minHeight: 70 }} value={p.features.join('\n')} onChange={e => edit(p.id, { features: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} />)}

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: C.body, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={p.multi_discount} onChange={e => edit(p.id, { multi_discount: e.target.checked })} style={{ width: 'auto' }} /> Auto 3+/5+ discount
              </label>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: C.body }}>Sizes:</span>
                {['S', 'M', 'L'].map(s => (
                  <label key={s} style={{ fontSize: 13, color: C.body, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={p.sizes.includes(s)} onChange={() => toggleSize(p, s)} style={{ width: 'auto' }} /> {s}
                  </label>
                ))}
              </div>
            </div>

            {/* Stock per variant */}
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Stock & backorder</label>
              {p.variants.length === 0 ? <div style={{ fontSize: 13, color: C.secondary }}>Save to create variant rows.</div> : p.variants.map(v => (
                <div key={v.size} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span style={{ width: 70, fontSize: 13, color: C.body }}>{v.size || 'One size'}</span>
                  <input style={{ ...input, width: 110 }} type="number" value={v.stock.toString()} onChange={e => editVariant(p.id, v.size, { stock: parseInt(e.target.value) || 0 })} />
                  <label style={{ fontSize: 13, color: C.body, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <input type="checkbox" checked={v.backorder} onChange={e => editVariant(p.id, v.size, { backorder: e.target.checked })} style={{ width: 'auto' }} /> Backorder
                  </label>
                </div>
              ))}
            </div>

            {/* Images */}
            {field('Image URLs (one per line)', <textarea style={{ ...input, minHeight: 54 }} value={p.image_urls.join('\n')} onChange={e => edit(p.id, { image_urls: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} placeholder="/products/beach-1.jpg" />)}
            <label style={{ display: 'inline-block', fontSize: 12, color: C.goldText, cursor: 'pointer', marginBottom: 14, textDecoration: 'underline', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              + Upload image
              <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(p, f) }} />
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => save(p)} disabled={savingId === p.id} style={{ background: savingId === p.id ? C.silver : C.gold, color: savingId === p.id ? '#fff' : C.navy, border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{savingId === p.id ? 'Saving…' : 'Save'}</button>
              <button onClick={() => remove(p)} style={{ background: 'transparent', border: `1px solid rgba(192,57,43,0.35)`, color: C.red, borderRadius: 8, padding: '10px 16px', fontSize: 11, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
