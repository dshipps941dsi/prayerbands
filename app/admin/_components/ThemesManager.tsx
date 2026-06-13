'use client'
import { useState, useEffect } from 'react'
import { deriveTheme, idealTextOn } from '@/lib/themes'

// Band theme editor. Built-in themes (from lib/themes.ts) are editable here as
// DB overrides; admins can also create brand-new themes. Self-contained; the
// parent screen handles admin auth.
const C = {
  pageBg: '#F6F1E4', card: '#FFFDF8', navy: '#0A1628', gold: '#C8A96E',
  goldText: '#9A7A35', silver: '#C9CFD6', heading: '#15223B', body: '#2A3344',
  secondary: '#5C6573', borderNavy: 'rgba(10,22,40,0.12)', green: '#4A8A6A', red: '#c0392b',
}

type T = {
  key: string; label: string; builtin: boolean; override: boolean; sort_order: number
  primary: string; background: string; surface: string; surfaceAlt: string
  text: string; textMuted: string; textOnPrimary: string
  accent: string; accentAlt: string; tabBar: string; tabActive: string
  border: string; cardAccent: string
  backgroundImage: string; backgroundImageWash: number
  verseText: string; verseReference: string
}

// Map an API theme object (BandTheme-ish + flags) to the flat editable shape.
function fromApi(a: any): T {
  return {
    key: a.key, label: a.label || '', builtin: !!a.builtin, override: !!a.override, sort_order: a.sort_order ?? 100,
    primary: a.primary || '#2A5298', background: a.background || '#EEF2F7', surface: a.surface || '#FFFFFF',
    surfaceAlt: a.surfaceAlt || '#DCE6F2', text: a.text || '#0D1F3C', textMuted: a.textMuted || '#5A7BA8',
    textOnPrimary: a.textOnPrimary || '#FFFFFF', accent: a.accent || '#D4A84B', accentAlt: a.accentAlt || '#2D4A2D',
    tabBar: a.tabBar || '#0D1F3C', tabActive: a.tabActive || '#D4A84B', border: a.border || '#C0D0E8',
    cardAccent: a.cardAccent || a.primary || '#2A5298',
    backgroundImage: a.backgroundImage || '', backgroundImageWash: a.backgroundImageWash ?? 0.82,
    verseText: a.defaultVerse?.text || '', verseReference: a.defaultVerse?.reference || '',
  }
}

// Build the BandTheme payload (palette + verse + image) to persist.
function toPayload(t: T) {
  const theme: any = {
    primary: t.primary, background: t.background, surface: t.surface, surfaceAlt: t.surfaceAlt,
    text: t.text, textMuted: t.textMuted, textOnPrimary: t.textOnPrimary,
    accent: t.accent, accentAlt: t.accentAlt, tabBar: t.tabBar, tabActive: t.tabActive,
    border: t.border, cardAccent: t.cardAccent,
  }
  if (t.backgroundImage) theme.backgroundImage = t.backgroundImage
  if (t.backgroundImageWash !== undefined) theme.backgroundImageWash = Number(t.backgroundImageWash)
  if (t.verseText.trim() && t.verseReference.trim()) {
    theme.defaultVerse = { text: t.verseText.trim(), reference: t.verseReference.trim() }
  }
  return theme
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export default function ThemesManager() {
  const [themes, setThemes] = useState<T[]>([])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState<Set<string>>(new Set())
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [newLabel, setNewLabel] = useState('')

  function load() {
    fetch('/api/admin/themes').then(r => r.json()).then(d => {
      if (Array.isArray(d.themes)) setThemes(d.themes.map(fromApi))
    })
  }
  useEffect(() => { load() }, [])

  function setField(key: string, patch: Partial<T>) {
    setThemes(prev => prev.map(t => t.key === key ? { ...t, ...patch } : t))
  }

  // Recompute the 9 derived colors from the 4 key colors, leaving key colors as-is.
  function reDerive(t: T) {
    const d = deriveTheme({ label: t.label, primary: t.primary, background: t.background, accent: t.accent, text: t.text })
    setField(t.key, {
      surface: d.surface, surfaceAlt: d.surfaceAlt, textMuted: d.textMuted, textOnPrimary: d.textOnPrimary,
      accentAlt: d.accentAlt, tabBar: d.tabBar, tabActive: d.tabActive, border: d.border, cardAccent: d.cardAccent || t.primary,
    })
    setMsg('Palette re-derived from key colors — Save to keep it.')
  }

  async function save(t: T) {
    if (!t.label.trim()) { setMsg('❌ Theme name is required.'); return }
    setSavingKey(t.key)
    const res = await fetch('/api/admin/themes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: t.key, label: t.label.trim(), theme: toPayload(t), sort_order: t.sort_order, isOverride: t.builtin, allowBuiltin: t.builtin }),
    })
    const d = await res.json()
    setSavingKey(null)
    if (res.ok) { setMsg('✅ Saved.'); load() }
    else setMsg('❌ ' + (d.error || 'Save failed.'))
  }

  async function remove(t: T) {
    const verb = t.builtin ? 'Reset this built-in theme to its default' : 'Delete this custom theme'
    if (!confirm(`${verb}? This can't be undone.`)) return
    const res = await fetch(`/api/admin/themes?key=${encodeURIComponent(t.key)}`, { method: 'DELETE' })
    const d = await res.json().catch(() => ({}))
    if (res.ok) { setMsg(t.builtin ? '✅ Reset to default.' : '✅ Deleted.'); setOpenKey(null); load() }
    else setMsg('❌ ' + (d.error || 'Failed.'))
  }

  function addTheme() {
    const label = newLabel.trim()
    if (!label) { setMsg('❌ Enter a name for the new theme.'); return }
    const key = slugify(label)
    if (!key) { setMsg('❌ Name must contain letters or numbers.'); return }
    if (themes.some(t => t.key === key)) { setMsg(`❌ A theme with key "${key}" already exists.`); return }
    const seed = deriveTheme({ label, primary: '#2A5298', background: '#EEF2F7', accent: '#D4A84B', text: '#0D1F3C' })
    const t: T = fromApi({ ...seed, key, builtin: false, override: false, sort_order: 100 })
    setThemes(prev => [...prev, t])
    setNewLabel('')
    setOpenKey(key)
    setMsg('New theme started — set the colors, then Save.')
  }

  async function uploadBg(t: T, file: File) {
    const fd = new FormData(); fd.append('file', file); fd.append('key', t.key)
    setMsg('Uploading image…')
    const res = await fetch('/api/admin/theme-image', { method: 'POST', body: fd })
    const d = await res.json()
    if (res.ok && d.url) { setField(t.key, { backgroundImage: d.url }); setMsg('✅ Image uploaded — Save to keep it.') }
    else setMsg('❌ ' + (d.error || 'Upload failed.'))
  }

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.goldText, display: 'block', marginBottom: 5, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${C.borderNavy}`, fontSize: 14, fontFamily: 'Inter, sans-serif', background: C.pageBg, color: C.body, boxSizing: 'border-box', outline: 'none' }

  // A color field: native swatch picker + hex text input, kept in sync.
  const colorField = (t: T, k: keyof T, lbl: string) => {
    const val = String(t[k] || '#000000')
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={label}>{lbl}</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(val) ? val : '#000000'} onChange={e => setField(t.key, { [k]: e.target.value.toUpperCase() } as Partial<T>)} style={{ width: 38, height: 34, border: `1px solid ${C.borderNavy}`, borderRadius: 6, background: 'none', cursor: 'pointer', flexShrink: 0 }} />
          <input style={{ ...input, fontFamily: 'monospace' }} value={val} onChange={e => setField(t.key, { [k]: e.target.value } as Partial<T>)} />
        </div>
      </div>
    )
  }

  const sorted = [...themes].sort((a, b) => (a.builtin === b.builtin ? a.sort_order - b.sort_order : a.builtin ? -1 : 1))

  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Themes</h2>
      <p style={{ color: C.secondary, fontSize: 14, margin: '0 0 20px' }}>Create band themes and set their colors, verse, and background image. New themes appear automatically in the product Theme dropdown.</p>

      {msg && <div style={{ marginBottom: 16, fontSize: 14, color: msg.startsWith('❌') ? C.red : C.green }}>{msg}</div>}

      {/* New theme */}
      <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
        <div style={{ flex: 1, minWidth: 180 }}><label style={label}>New theme name</label><input style={input} value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Pickleball" onKeyDown={e => { if (e.key === 'Enter') addTheme() }} /></div>
        <button onClick={addTheme} style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>+ Add Theme</button>
      </div>

      {sorted.map(t => {
        const isOpen = openKey === t.key
        const isAdv = advanced.has(t.key)
        return (
          <div key={t.key} style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, marginBottom: 14, boxShadow: '0 2px 10px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
            {/* Header row — swatch + name + open/close */}
            <div onClick={() => setOpenKey(isOpen ? null : t.key)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.borderNavy}`, flexShrink: 0 }}>
                {[t.primary, t.background, t.accent, t.text].map((c, i) => <div key={i} style={{ width: 22, height: 30, background: c }} />)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: C.heading, fontFamily: 'Inter, sans-serif', fontSize: 15 }}>{t.label} {t.builtin && <span style={{ fontSize: 10, color: C.goldText, border: `1px solid ${C.borderNavy}`, borderRadius: 999, padding: '1px 8px', marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.override ? 'Built-in · edited' : 'Built-in'}</span>}</div>
                <div style={{ fontSize: 12, color: C.secondary, fontFamily: 'monospace' }}>{t.key}</div>
              </div>
              <div style={{ fontSize: 20, color: C.secondary }}>{isOpen ? '▾' : '▸'}</div>
            </div>

            {isOpen && (
              <div style={{ padding: '4px 18px 18px', borderTop: `1px solid ${C.borderNavy}` }}>
                {/* Live preview */}
                <div style={{ background: t.background, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16, margin: '14px 0 18px' }}>
                  <div style={{ color: t.text, fontFamily: 'Georgia, serif', fontSize: 15, marginBottom: 4 }}>{t.label} preview</div>
                  <div style={{ color: t.textMuted, fontSize: 12, marginBottom: 12 }}>This is how cards and text look on this theme.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ background: t.primary, color: t.textOnPrimary, padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>Primary</span>
                    <span style={{ background: 'transparent', color: t.accent, border: `1px solid ${t.accent}`, padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>Accent</span>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: C.secondary, marginBottom: 14 }}>Set the four key colors — the rest of the palette is derived. Open Advanced to fine-tune everything.</div>

                {/* Simple: 4 key colors */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
                  <div style={{ minWidth: 0 }}>{field2('Theme name', <input style={input} value={t.label} onChange={e => setField(t.key, { label: e.target.value })} />, label)}</div>
                  <div />
                  {colorField(t, 'primary', 'Primary / key color')}
                  {colorField(t, 'background', 'Background')}
                  {colorField(t, 'accent', 'Accent / highlight')}
                  {colorField(t, 'text', 'Text')}
                </div>
                <button onClick={() => reDerive(t)} style={{ background: 'transparent', border: `1px solid ${C.borderNavy}`, color: C.body, borderRadius: 8, padding: '8px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>↻ Re-derive palette from key colors</button>

                {/* Verse */}
                <div style={{ marginBottom: 6 }}>{field2('Default verse (optional)', <textarea style={{ ...input, minHeight: 64, resize: 'vertical', fontFamily: 'Georgia, serif' }} value={t.verseText} onChange={e => setField(t.key, { verseText: e.target.value })} placeholder="Shown on the band's first tap" />, label)}</div>
                <div style={{ marginBottom: 16 }}>{field2('Verse reference', <input style={input} value={t.verseReference} onChange={e => setField(t.key, { verseReference: e.target.value })} placeholder="Philippians 3:14" />, label)}</div>

                {/* Background image */}
                <div style={{ marginBottom: 6 }}>
                  <label style={label}>Background image (optional)</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {t.backgroundImage && <img src={t.backgroundImage} alt="" style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.borderNavy}` }} />}
                    <label style={{ background: 'transparent', border: `1px solid ${C.borderNavy}`, color: C.body, borderRadius: 8, padding: '9px 16px', fontSize: 11, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t.backgroundImage ? 'Replace image' : 'Upload image'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadBg(t, f) }} />
                    </label>
                    {t.backgroundImage && <button onClick={() => setField(t.key, { backgroundImage: '' })} style={{ background: 'transparent', border: 'none', color: C.red, fontSize: 12, cursor: 'pointer' }}>Remove</button>}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>{field2('Image wash (0 = bold image, 1 = subtle)', <input type="range" min={0} max={1} step={0.02} value={t.backgroundImageWash} onChange={e => setField(t.key, { backgroundImageWash: Number(e.target.value) })} style={{ width: '100%' }} />, label)}<div style={{ fontSize: 12, color: C.secondary }}>{t.backgroundImageWash.toFixed(2)}</div></div>

                {/* Advanced */}
                <button onClick={() => setAdvanced(prev => { const n = new Set(prev); n.has(t.key) ? n.delete(t.key) : n.add(t.key); return n })} style={{ background: 'transparent', border: 'none', color: C.goldText, fontSize: 12, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0, marginBottom: 12 }}>{isAdv ? '▾ Hide advanced colors' : '▸ Advanced colors (all 13)'}</button>
                {isAdv && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px', marginBottom: 12 }}>
                    {colorField(t, 'surface', 'Surface (cards)')}
                    {colorField(t, 'surfaceAlt', 'Surface alt')}
                    {colorField(t, 'textMuted', 'Text muted')}
                    {colorField(t, 'textOnPrimary', 'Text on primary')}
                    {colorField(t, 'accentAlt', 'Accent alt')}
                    {colorField(t, 'tabBar', 'Tab bar')}
                    {colorField(t, 'tabActive', 'Tab active')}
                    {colorField(t, 'border', 'Border')}
                    {colorField(t, 'cardAccent', 'Card accent')}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button onClick={() => save(t)} disabled={savingKey === t.key} style={{ background: savingKey === t.key ? C.silver : C.gold, color: savingKey === t.key ? '#fff' : C.navy, border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{savingKey === t.key ? 'Saving…' : 'Save'}</button>
                  {(!t.builtin || t.override) && (
                    <button onClick={() => remove(t)} style={{ background: 'transparent', border: `1px solid rgba(192,57,43,0.35)`, color: C.red, borderRadius: 8, padding: '10px 16px', fontSize: 11, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.builtin ? 'Reset to default' : 'Delete'}</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Local field helper (kept inline so the component stays self-contained).
function field2(l: string, node: React.ReactNode, labelStyle: React.CSSProperties) {
  return <div style={{ marginBottom: 12 }}><label style={labelStyle}>{l}</label>{node}</div>
}
