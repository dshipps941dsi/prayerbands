'use client'
import { useState, useEffect } from 'react'
import { deriveTheme } from '@/lib/themes'

// Band theme editor. Built-in themes (from lib/themes.ts) are editable here as
// DB overrides; admins can also create brand-new themes. Self-contained; the
// parent screen handles admin auth.
const C = {
  pageBg: '#F6F1E4', card: '#FFFDF8', navy: '#0A1628', gold: '#C8A96E',
  goldText: '#9A7A35', silver: '#C9CFD6', heading: '#15223B', body: '#2A3344',
  secondary: '#5C6573', borderNavy: 'rgba(10,22,40,0.12)', green: '#4A8A6A', red: '#c0392b',
}

type T = {
  key: string; label: string; builtin: boolean; override: boolean; sort_order: number; bands: number
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
    key: a.key, label: a.label || '', builtin: !!a.builtin, override: !!a.override, sort_order: a.sort_order ?? 100, bands: a.bands ?? 0,
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

// Hex + alpha, for the image wash in the preview. Mirrors pageBackground() in
// lib/themes.ts so the preview washes an image exactly as the band page does.
function hexA(hex: string, alpha: number): string {
  const h = (hex || '').replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  const n = parseInt(full, 16) || 0
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
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

  // Changing a key colour now carries the rest of the palette with it.
  //
  // A new theme starts from the Mountain palette, and the nine derived colours
  // only moved if you found the re-derive button. So picking black for primary
  // and grey for the background left tabBar on Mountain's navy — and tabBar is
  // the verse card, which is why the Black theme had a blue verse area sitting
  // in the middle of it.
  //
  // Advanced is the opt-out: once it is open those nine fields are yours, and
  // deriving over hand-picked colours would be worse than the original bug.
  function setKeyColor(t: T, patch: Partial<T>) {
    const next = { ...t, ...patch }
    if (advanced.has(t.key)) { setField(t.key, patch); return }
    const d = deriveTheme({ label: next.label, primary: next.primary, background: next.background, accent: next.accent, text: next.text })
    setField(t.key, {
      ...patch,
      surface: d.surface, surfaceAlt: d.surfaceAlt, textMuted: d.textMuted, textOnPrimary: d.textOnPrimary,
      accentAlt: d.accentAlt, tabBar: d.tabBar, tabActive: d.tabActive, border: d.border, cardAccent: d.cardAccent || next.primary,
    })
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
  // `isKey` marks the four colours the rest of the palette is derived from.
  const colorField = (t: T, k: keyof T, lbl: string, isKey = false) => {
    const val = String(t[k] || '#000000')
    const write = (v: string) => {
      const patch = { [k]: v } as Partial<T>
      if (isKey) setKeyColor(t, patch); else setField(t.key, patch)
    }
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={label}>{lbl}</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(val) ? val : '#000000'} onChange={e => write(e.target.value.toUpperCase())} style={{ width: 38, height: 34, border: `1px solid ${C.borderNavy}`, borderRadius: 6, background: 'none', cursor: 'pointer', flexShrink: 0 }} />
          <input style={{ ...input, fontFamily: 'monospace' }} value={val} onChange={e => write(e.target.value)} />
        </div>
      </div>
    )
  }

  // What a band actually looks like in this theme — a phone-framed mock of the
  // real band page, painted from the same tokens the live page reads, so it
  // repaints as the pickers move. The "real page" link opens an actual band with
  // this theme forced on (?previewTheme=), for a true on-device look.
  const preview = (t: T) => {
    const page = t.backgroundImage
      ? `linear-gradient(${hexA(t.background, t.backgroundImageWash ?? 0.82)}, ${hexA(t.background, t.backgroundImageWash ?? 0.82)}), url("${t.backgroundImage}") center / cover no-repeat, ${t.background}`
      : t.background
    const tabs: [string, boolean][] = [['Requests', true], ['Partners', false], ['Circles', false]]
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.secondary }}>Live preview</div>
          <a href={`/band/PB-TEST1?previewTheme=${encodeURIComponent(t.key)}`} target="_blank" rel="noopener noreferrer"
             style={{ fontSize: 11, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase', color: C.goldText, textDecoration: 'none', border: `1px solid ${C.borderNavy}`, borderRadius: 999, padding: '5px 12px' }}>
            View on a real band page &#8599;
          </a>
        </div>

        {/* Phone frame */}
        <div style={{ maxWidth: 320, margin: '0 auto', background: '#0A0A0A', borderRadius: 30, padding: 8, boxShadow: '0 18px 50px rgba(10,22,40,0.22)' }}>
          <div style={{ borderRadius: 23, overflow: 'hidden', background: page }}>
            <div style={{ padding: '16px 15px 18px' }}>
              {/* App bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: t.primary, border: `1.5px solid ${t.accent}` }} />
                  <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700, fontSize: 15, color: t.text }}>Prayer Bands</span>
                </div>
                <span style={{ fontSize: 9.5, fontFamily: 'monospace', color: t.textMuted, background: t.surfaceAlt, borderRadius: 999, padding: '2px 8px' }}>PB-TEST1</span>
              </div>

              {/* Daily-verse hero */}
              <div style={{ background: t.tabBar, borderLeft: `3px solid ${t.cardAccent}`, borderRadius: 12, padding: '16px 16px 15px', marginBottom: 14 }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 8.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.tabActive, marginBottom: 9 }}>Today&rsquo;s Verse</div>
                <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 15, lineHeight: 1.65, color: t.textOnPrimary }}>
                  &ldquo;{(t.verseText || 'For I know the plans I have for you, declares the Lord.').slice(0, 120)}&rdquo;
                </div>
                <div style={{ fontSize: 11, color: t.tabActive, marginTop: 9, letterSpacing: '0.06em' }}>{t.verseReference || 'Jeremiah 29:11'}</div>
              </div>

              {/* Prayers tab bar */}
              <div style={{ display: 'flex', gap: 4, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 11, padding: 4, marginBottom: 12 }}>
                {tabs.map(([lbl, active]) => (
                  <div key={lbl} style={{ flex: 1, textAlign: 'center', padding: '7px 4px', borderRadius: 8, background: active ? t.primary : 'transparent', color: active ? t.textOnPrimary : t.textMuted, fontFamily: 'Cinzel, serif', fontSize: 9.5, fontWeight: active ? 700 : 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{lbl}</div>
                ))}
              </div>

              {/* Journey / prayer card */}
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 11, padding: '13px 15px', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 3 }}>A prayer on this band</div>
                <div style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.55 }}>Carried by someone in Venice, Florida.</div>
                <div style={{ display: 'inline-block', marginTop: 10, background: t.surfaceAlt, color: t.text, borderRadius: 999, padding: '3px 11px', fontSize: 11, fontWeight: 600 }}>3 stops</div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: t.primary, color: t.textOnPrimary, borderRadius: 10, padding: '11px 14px', fontSize: 12.5, fontWeight: 700, textAlign: 'center' }}>Pass it on</div>
                <div style={{ background: 'transparent', border: `1px solid ${t.accent}`, color: t.accent, borderRadius: 10, padding: '11px 14px', fontSize: 12.5, fontWeight: 700, textAlign: 'center' }}>Share</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const sorted = [...themes].sort((a, b) => (a.builtin === b.builtin ? a.sort_order - b.sort_order : a.builtin ? -1 : 1))

  return (
    <div style={{ maxWidth: 1400 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Themes</h2>
      <p style={{ color: C.secondary, fontSize: 14, margin: '0 0 20px' }}>Create band themes and set their colors, verse, and background image. New themes appear automatically in the product Theme dropdown.</p>

      {msg && <div style={{ marginBottom: 16, fontSize: 14, color: msg.startsWith('❌') ? C.red : C.green }}>{msg}</div>}

      {/* New theme */}
      <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
        <div style={{ flex: 1, minWidth: 180 }}><label style={label}>New theme name</label><input style={input} value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Pickleball" onKeyDown={e => { if (e.key === 'Enter') addTheme() }} /></div>
        <button onClick={addTheme} style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>+ Add Theme</button>
      </div>

      {/* Collapsed themes tile three across as a swatch index; the open one
          takes the full row, since its editor is a two-column field grid that
          would be unusable at a third of the width. */}
      <div className="pb-admin-cols3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, alignItems: 'start' }}>
      {sorted.map(t => {
        const isOpen = openKey === t.key
        const isAdv = advanced.has(t.key)
        return (
          <div key={t.key} style={{ background: C.card, border: `1px solid ${isOpen ? C.gold : C.borderNavy}`, borderRadius: 12, boxShadow: '0 2px 10px rgba(10,22,40,0.06)', overflow: 'hidden', gridColumn: isOpen ? '1 / -1' : 'auto' }}>
            {/* Header row — swatch + name + open/close */}
            <div onClick={() => setOpenKey(isOpen ? null : t.key)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.borderNavy}`, flexShrink: 0 }}>
                {[t.primary, t.background, t.accent, t.text].map((c, i) => <div key={i} style={{ width: 22, height: 30, background: c }} />)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: C.heading, fontFamily: 'Inter, sans-serif', fontSize: 15 }}>{t.label} {t.builtin && <span style={{ fontSize: 10, color: C.goldText, border: `1px solid ${C.borderNavy}`, borderRadius: 999, padding: '1px 8px', marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.override ? 'Built-in · edited' : 'Built-in'}</span>}</div>
                <div style={{ fontSize: 12, color: C.secondary, fontFamily: 'monospace' }}>{t.key}</div>
                {/* A theme that styles nothing looks identical to one that
                    works: it saves, it lists, and the bands carry on looking
                    exactly as they did. Say which it is. */}
                {t.bands > 0 ? (
                  <div style={{ fontSize: 11.5, color: C.secondary, marginTop: 3 }}>
                    Worn by <strong style={{ color: C.heading }}>{t.bands}</strong> band{t.bands === 1 ? '' : 's'}
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: '#B4441F', marginTop: 3, fontWeight: 600 }}>
                    Styles no bands
                  </div>
                )}
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
                  {colorField(t, 'primary', 'Primary / key color', true)}
                  {colorField(t, 'background', 'Background', true)}
                  {colorField(t, 'accent', 'Accent / highlight', true)}
                  {colorField(t, 'text', 'Text', true)}
                </div>
                {/* Bottom nav (footer) — its own controls, since these drive the
                    always-visible tab bar and its active icon independently. */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px', marginTop: 6 }}>
                  <div style={{ gridColumn: '1 / -1', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.secondary, fontFamily: 'Cinzel, serif', margin: '2px 0 6px' }}>Bottom nav (footer)</div>
                  {colorField(t, 'tabBar', 'Footer background')}
                  {colorField(t, 'tabActive', 'Active tab / icon')}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                  <button onClick={() => reDerive(t)} style={{ background: 'transparent', border: `1px solid ${C.borderNavy}`, color: C.body, borderRadius: 8, padding: '8px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>↻ Re-derive palette from key colors</button>
                  <span style={{ fontSize: 12, color: C.secondary }}>
                    {isAdv
                      ? 'Advanced is open — the nine colours below stay as you set them.'
                      : 'The rest of the palette follows the four colours above.'}
                  </span>
                </div>

                {/* Live preview — updates as the colours change */}
                <div style={{ marginBottom: 18 }}>{preview(t)}</div>

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
                <button onClick={() => setAdvanced(prev => { const n = new Set(prev); n.has(t.key) ? n.delete(t.key) : n.add(t.key); return n })} style={{ background: 'transparent', border: 'none', color: C.goldText, fontSize: 12, cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0, marginBottom: 12 }}>{isAdv ? '▾ Hide advanced colors' : '▸ Advanced colors (surfaces, borders…)'}</button>
                {isAdv && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px', marginBottom: 12 }}>
                    {colorField(t, 'surface', 'Surface (cards)')}
                    {colorField(t, 'surfaceAlt', 'Surface alt')}
                    {colorField(t, 'textMuted', 'Text muted')}
                    {colorField(t, 'textOnPrimary', 'Text on primary')}
                    {colorField(t, 'accentAlt', 'Accent alt')}
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
    </div>
  )
}

// Local field helper (kept inline so the component stays self-contained).
function field2(l: string, node: React.ReactNode, labelStyle: React.CSSProperties) {
  return <div style={{ marginBottom: 12 }}><label style={labelStyle}>{l}</label>{node}</div>
}
