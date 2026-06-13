'use client'
import { useState, useEffect, type CSSProperties } from 'react'

// Self-contained pricing editor: site_config amounts (drive Stripe checkout)
// + subscription plans. Used on the combined Band Management screen.
const C = {
  pageBg: '#F6F1E4', card: '#FFFDF8', navy: '#0A1628', gold: '#C8A96E',
  goldText: '#9A7A35', heading: '#15223B', body: '#2A3344', secondary: '#5C6573',
  borderNavy: 'rgba(10,22,40,0.12)',
}

export default function PricingManager() {
  const [siteConfig, setSiteConfig] = useState<{ key: string; value: string; label: string | null }[]>([])
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [subPlans, setSubPlans] = useState<any[]>([])
  const [subPlanDraft, setSubPlanDraft] = useState<Record<string, { total_price: string; discount_percent: string }>>({})
  const [savingPlan, setSavingPlan] = useState<string | null>(null)

  useEffect(() => { loadSiteConfig(); loadSubPlans() }, [])

  async function loadSiteConfig() {
    const res = await fetch('/api/admin/site-config')
    if (!res.ok) return
    const { rows } = await res.json()
    if (rows) {
      setSiteConfig(rows)
      const draft: Record<string, string> = {}
      rows.forEach((r: any) => { draft[r.key] = (Number(r.value) / 100).toFixed(2) })
      setConfigDraft(draft)
    }
  }

  async function loadSubPlans() {
    const res = await fetch('/api/admin/subscription-plans')
    if (!res.ok) return
    const { plans } = await res.json()
    setSubPlans(plans || [])
    const draft: Record<string, { total_price: string; discount_percent: string }> = {}
    ;(plans || []).forEach((p: any) => { draft[p.id] = { total_price: Number(p.total_price).toFixed(2), discount_percent: String(p.discount_percent ?? 0) } })
    setSubPlanDraft(draft)
  }

  async function saveSubPlan(id: string) {
    const d = subPlanDraft[id]
    if (!d) return
    setSavingPlan(id)
    const res = await fetch('/api/admin/subscription-plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, total_price: parseFloat(d.total_price), discount_percent: parseInt(d.discount_percent || '0', 10) }),
    })
    if (res.ok) await loadSubPlans()
    else { const j = await res.json().catch(() => ({})); alert(j.error || 'Could not save.') }
    setSavingPlan(null)
  }

  async function saveConfig(key: string) {
    const dollars = parseFloat(configDraft[key])
    if (Number.isNaN(dollars) || dollars < 0) { alert('Enter a valid dollar amount.'); return }
    const cents = Math.round(dollars * 100)
    setSavingKey(key)
    const res = await fetch('/api/admin/site-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: cents }),
    })
    setSavingKey(null)
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert('Save failed: ' + (d.error || res.status)); return }
    setSiteConfig(prev => prev.map(r => r.key === key ? { ...r, value: String(cents) } : r))
    setConfigDraft(d => ({ ...d, [key]: (cents / 100).toFixed(2) }))
  }

  const inputStyle: CSSProperties = { width: '90px', padding: '8px 10px', border: `1px solid ${C.borderNavy}`, borderRadius: '6px', fontSize: '14px', fontFamily: 'Inter, sans-serif', background: C.pageBg, color: C.body, outline: 'none' }
  const saveBtn: CSSProperties = { background: C.gold, color: C.navy, border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }

  return (
    <div>
      <h2 style={{ margin: '0 0 6px', fontSize: '22px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>Pricing &amp; Shipping</h2>
      <p style={{ fontSize: '13px', color: C.secondary, margin: '0 0 20px' }}>Edit amounts in dollars. Saved values drive Stripe checkout immediately.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
        {siteConfig.length === 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '8px', padding: '20px', textAlign: 'center', color: C.secondary, fontSize: '13px' }}>
            No config rows found. Run the site_config migration in Supabase.
          </div>
        )}
        {siteConfig.map(row => (
          <div key={row.key} style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '8px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', color: C.heading, fontWeight: 600 }}>{row.label || row.key}</div>
              <div style={{ fontSize: '11px', color: C.secondary, fontFamily: 'monospace' }}>{row.key}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: C.goldText, fontWeight: 600 }}>$</span>
              <input type="number" step="0.01" min="0" value={configDraft[row.key] ?? ''} onChange={e => setConfigDraft(d => ({ ...d, [row.key]: e.target.value }))} style={inputStyle} />
            </div>
            <button onClick={() => saveConfig(row.key)} disabled={savingKey === row.key} style={saveBtn}>{savingKey === row.key ? 'Saving…' : 'Save'}</button>
          </div>
        ))}
      </div>

      <h2 style={{ margin: '32px 0 6px', fontSize: '22px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>Subscription Plans</h2>
      <p style={{ fontSize: '13px', color: C.secondary, margin: '0 0 20px' }}>Total is what Stripe charges new subscribers (existing ones keep their rate) and what /subscribe shows. Discount % is the marketing label on the page.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '560px' }}>
        {subPlans.length === 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '8px', padding: '20px', textAlign: 'center', color: C.secondary, fontSize: '13px' }}>No subscription plans found.</div>
        )}
        {subPlans.map(p => (
          <div key={p.id} style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '8px', padding: '14px 16px', display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: '14px', color: C.heading, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: '11px', color: C.secondary, fontFamily: 'monospace' }}>{p.id} · {p.bands_per_cycle} band{p.bands_per_cycle > 1 ? 's' : ''} / {p.interval_months} mo</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: C.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Cinzel, serif' }}>Total $</span>
              <input type="number" step="0.01" min="0" value={subPlanDraft[p.id]?.total_price ?? ''} onChange={e => setSubPlanDraft(d => ({ ...d, [p.id]: { ...(d[p.id] || { total_price: '', discount_percent: '' }), total_price: e.target.value } }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: C.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Cinzel, serif' }}>Discount %</span>
              <input type="number" step="1" min="0" max="100" value={subPlanDraft[p.id]?.discount_percent ?? ''} onChange={e => setSubPlanDraft(d => ({ ...d, [p.id]: { ...(d[p.id] || { total_price: '', discount_percent: '' }), discount_percent: e.target.value } }))} style={{ ...inputStyle, width: '70px' }} />
            </div>
            <button onClick={() => saveSubPlan(p.id)} disabled={savingPlan === p.id} style={saveBtn}>{savingPlan === p.id ? 'Saving…' : 'Save'}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
