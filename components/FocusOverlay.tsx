'use client'

import { useEffect, useState } from 'react'

// A full-screen focus layer: tap a section's expand control to fill the screen
// with just that section, an ✕ to close. Locks background scroll, closes on
// Escape, and respects the device safe area. Themed via --pb-* by default; pass
// `background` for a bespoke ground (e.g. the verse meditation).
export default function FocusOverlay({
  onClose,
  background,
  closeColor = 'currentColor',
  children,
}: {
  onClose: () => void
  background?: string
  closeColor?: string
  children: React.ReactNode
}) {
  // Soft fade-in (and a gentle rise for the content), honoring reduced-motion.
  const [shown, setShown] = useState(false)
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: background || 'var(--pb-background, #F6F1E4)',
        color: 'var(--pb-text, #2C1810)',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        opacity: reduce || shown ? 1 : 0,
        transition: reduce ? 'none' : 'opacity 0.5s ease',
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 14px)', right: 16, zIndex: 1001,
          width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(128,128,128,0.25)',
          background: 'rgba(128,128,128,0.12)', color: closeColor, fontSize: 20, lineHeight: 1,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}
      >
        ✕
      </button>
      <div style={{
        opacity: reduce || shown ? 1 : 0,
        transform: reduce || shown ? 'none' : 'translateY(14px)',
        transition: reduce ? 'none' : 'opacity 0.6s ease 0.05s, transform 0.6s ease 0.05s',
      }}>
        {children}
      </div>
    </div>
  )
}
