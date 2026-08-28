'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// Self-contained color picker: a swatch button that opens a popover with curated
// preset swatches AND a visual HSV picker (saturation/brightness square + hue
// slider) + a hex field. No native <input type="color">, no external libs.

const SWATCHES = [
  '#C8A96E', '#B8860B', '#9A7A35', '#D9BE86', // golds
  '#1A2A4A', '#0A1628', '#2A5298', '#16294A', // navies/blues
  '#2B8C5A', '#2F7D5B', '#0E7490', '#2CA6A4', // greens/teals
  '#D64545', '#B4423A', '#B8328A', '#D97706', // reds/magenta/amber
  '#FFFFFF', '#EAEAEA', '#9AA0A6', '#5C6573',  // lights/greys
  '#383838', '#1C1C1C', '#000000', '#F6F1E4',  // darks + cream
]

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || '').replace('#', '')
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  const n = parseInt(f, 16) || 0
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  return { h, s: mx ? (d / mx) * 100 : 0, v: mx * 100 }
}
function hsvToHex(h: number, s: number, v: number): string {
  h = ((h % 360) + 360) % 360; s /= 100; v /= 100
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}
const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)

export default function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  const safe = isHex(value) ? value.toUpperCase() : '#000000'
  const [r, g, b] = hexToRgb(safe)
  const hsv = rgbToHsv(r, g, b)

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const dragSV = useCallback((clientX: number, clientY: number) => {
    const el = svRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    const s = clamp((clientX - rect.left) / rect.width, 0, 1) * 100
    const v = (1 - clamp((clientY - rect.top) / rect.height, 0, 1)) * 100
    onChange(hsvToHex(hsv.h, s, v))
  }, [hsv.h, onChange])

  const dragHue = useCallback((clientX: number) => {
    const el = hueRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    const h = clamp((clientX - rect.left) / rect.width, 0, 1) * 360
    onChange(hsvToHex(h, hsv.s || 1, hsv.v || 1))
  }, [hsv.s, hsv.v, onChange])

  // Pointer drag helper: fires move handler until pointer up.
  const startDrag = (move: (x: number, y: number) => void) => (e: React.PointerEvent) => {
    e.preventDefault()
    move(e.clientX, e.clientY)
    const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY)
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const hueHex = hsvToHex(hsv.h, 100, 100)

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Choose color"
        style={{ width: 38, height: 34, borderRadius: 6, border: '1px solid rgba(10,22,40,0.25)', background: safe, cursor: 'pointer', padding: 0 }}
      />
      {open && (
        <div style={{ position: 'absolute', zIndex: 60, top: 40, left: 0, width: 224, background: '#fff', border: '1px solid rgba(10,22,40,0.18)', borderRadius: 10, boxShadow: '0 12px 32px rgba(10,22,40,0.22)', padding: 12 }}>
          {/* Swatches */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, marginBottom: 12 }}>
            {SWATCHES.map(sw => (
              <button
                key={sw}
                type="button"
                onClick={() => onChange(sw)}
                aria-label={sw}
                style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 5, cursor: 'pointer', background: sw, border: safe === sw ? '2px solid #0A1628' : '1px solid rgba(10,22,40,0.15)', padding: 0 }}
              />
            ))}
          </div>

          {/* Saturation / brightness square */}
          <div
            ref={svRef}
            onPointerDown={startDrag(dragSV)}
            style={{ position: 'relative', width: '100%', height: 120, borderRadius: 8, cursor: 'crosshair', touchAction: 'none', background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})` }}
          >
            <div style={{ position: 'absolute', left: `${hsv.s}%`, top: `${100 - hsv.v}%`, width: 12, height: 12, borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
          </div>

          {/* Hue slider */}
          <div
            ref={hueRef}
            onPointerDown={startDrag((x) => dragHue(x))}
            style={{ position: 'relative', width: '100%', height: 14, borderRadius: 7, margin: '10px 0', cursor: 'pointer', touchAction: 'none', background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
          >
            <div style={{ position: 'absolute', left: `${(hsv.h / 360) * 100}%`, top: '50%', width: 14, height: 14, borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
          </div>

          {/* Hex entry */}
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="#RRGGBB"
            style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid rgba(10,22,40,0.2)', fontFamily: 'monospace', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
      )}
    </div>
  )
}
