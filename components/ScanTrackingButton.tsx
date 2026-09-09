'use client'
import { useEffect, useRef, useState } from 'react'

// A camera button for the tracking-number box. Opens the rear camera, reads
// the barcode on the shipping label, and hands back the tracking number so
// nobody has to type a 22-digit string off a sticker.
//
// Uses the browser's built-in BarcodeDetector where it exists (Chrome on
// Android, recent Safari) and falls back to ZXing, loaded only when the
// scanner opens so the page itself carries none of it. Needs HTTPS and a
// camera permission, both of which the packing station already has.

// Carrier labels rarely encode the bare tracking number. USPS's IMpb barcode
// starts with the routing application identifier and ZIP ("420" + 5 or 9
// digits) before the number; FedEx's 34-digit barcode ends in the 12-digit
// number people actually use. Peel those off so what lands in the box is
// what the customer's email should carry. Anything unrecognised is passed
// through untouched — the operator can still edit it.
export function normalizeTracking(raw: string): string {
  const s = raw.trim()
  const ups = s.match(/1Z[A-Z0-9]{16}/i)
  if (ups) return ups[0].toUpperCase()
  const digits = s.replace(/\D/g, '')
  if (!digits) return s
  if (digits.startsWith('420') && digits.length > 22) {
    for (const zipLen of [9, 5]) {
      const rest = digits.slice(3 + zipLen)
      if (rest.startsWith('9') && [22, 26, 30, 34].includes(rest.length)) return rest
    }
    return digits.slice(-22)
  }
  if (digits.length === 34 && /^(96|00)/.test(digits)) return digits.slice(-12)
  if (digits.length >= 20 && digits.length <= 34) return digits
  return s
}

type Props = { onScan: (tracking: string) => void; style?: React.CSSProperties; label?: string }

export default function ScanTrackingButton({ onScan, style, label = 'Scan' }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stopRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError('')

    const finish = (text: string) => {
      if (cancelled) return
      cancelled = true
      stopRef.current()
      if (navigator.vibrate) { try { navigator.vibrate(60) } catch {} }
      onScan(normalizeTracking(text))
      setOpen(false)
    }

    ;(async () => {
      const video = videoRef.current
      if (!video) return
      const Detector = (window as any).BarcodeDetector
      try {
        if (Detector) {
          // Native path: our own stream + a detector polling the frames.
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
          video.srcObject = stream
          await video.play()
          const detector = new Detector({ formats: ['code_128', 'code_39', 'itf', 'pdf417', 'qr_code', 'ean_13', 'data_matrix'] })
          let timer: any
          stopRef.current = () => { clearInterval(timer); stream.getTracks().forEach(t => t.stop()) }
          timer = setInterval(async () => {
            if (cancelled || video.readyState < 2) return
            try {
              const codes = await detector.detect(video)
              const hit = codes.find((c: any) => c.rawValue && c.rawValue.trim())
              if (hit) finish(hit.rawValue)
            } catch { /* keep polling */ }
          }, 200)
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          const reader = new BrowserMultiFormatReader()
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: 'environment' } }, audio: false },
            video,
            (result) => { if (result) finish(result.getText()) }
          )
          stopRef.current = () => controls.stop()
        }
      } catch (e: any) {
        if (cancelled) return
        const name = e?.name || ''
        setError(name === 'NotAllowedError' ? 'Camera permission was refused. Allow camera access for this site and try again.'
          : name === 'NotFoundError' ? 'No camera was found on this device.'
          : 'Could not start the camera.')
      }
    })()

    return () => { cancelled = true; stopRef.current(); stopRef.current = () => {} }
  }, [open, onScan])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Scan the barcode on the label"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', border: '1px solid rgba(200,169,110,0.6)', background: 'rgba(200,169,110,0.12)', color: '#9A7A35', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', ...style }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M7 8v8M10 8v8M13 8v8M17 8v8" />
        </svg>
        {label}
      </button>

      {open && (
        <div role="dialog" aria-label="Scan tracking barcode" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <video ref={videoRef} playsInline muted style={{ flex: 1, width: '100%', objectFit: 'cover', background: '#000' }} />
          {/* Aiming guide: a wide short box, the shape of a Code 128 strip. */}
          <div style={{ position: 'absolute', left: '8%', right: '8%', top: '38%', height: '22%', border: '2px solid rgba(200,169,110,0.9)', borderRadius: 10, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(38% + 22% + 16px)', textAlign: 'center', color: '#F5EDD8', fontSize: 14, padding: '0 24px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            {error || 'Line up the barcode on the shipping label. It reads on its own.'}
          </div>
          <button type="button" onClick={() => setOpen(false)}
            style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', right: 14, padding: '10px 16px', background: 'rgba(0,0,0,0.55)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </>
  )
}
