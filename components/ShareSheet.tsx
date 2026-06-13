'use client'

import { useState } from 'react'

const NAVY = '#0A1628'
const GOLD = '#C8A96E'

type Variant = 'gold' | 'navy' | 'ghost'

/**
 * Reusable social-share control.
 *
 * On devices that support it (most phones) the button opens the OS native
 * share sheet via navigator.share. Everywhere else it drops down a small menu
 * with explicit Facebook / X / WhatsApp / Copy-link options. Either way the
 * shared payload points back at a public Prayer Bands URL.
 */
export default function ShareSheet({
  url,
  title,
  text,
  label = 'Share',
  variant = 'gold',
  block = false,
}: {
  url: string
  title: string
  text?: string
  label?: string
  variant?: Variant
  block?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareText = text || title
  const enc = encodeURIComponent

  const fb = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`
  const x = `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(url)}`
  const wa = `https://wa.me/?text=${enc(`${shareText} ${url}`)}`

  async function handleClick() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: shareText, url })
      } catch {
        /* user dismissed the native sheet — nothing to do */
      }
      return
    }
    setOpen(o => !o)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  const palette =
    variant === 'navy'
      ? { bg: NAVY, fg: '#F5EDD8', border: NAVY }
      : variant === 'ghost'
      ? { bg: 'transparent', fg: GOLD, border: GOLD }
      : { bg: GOLD, fg: NAVY, border: GOLD }

  const menuItem: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #eee',
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    color: '#2a3344',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'left',
  }

  return (
    <div style={{ position: 'relative', display: block ? 'block' : 'inline-block' }}>
      <button
        type="button"
        onClick={handleClick}
        style={{
          width: block ? '100%' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '11px 22px',
          borderRadius: 10,
          background: palette.bg,
          color: palette.fg,
          border: `1px solid ${palette.border}`,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: "'Cinzel', serif",
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
        </svg>
        {label}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            aria-hidden
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              minWidth: 200,
              background: '#fff',
              borderRadius: 10,
              boxShadow: '0 10px 30px rgba(10,22,40,0.18)',
              border: '1px solid #e8d8b0',
              overflow: 'hidden',
              zIndex: 41,
            }}
          >
            <a href={fb} target="_blank" rel="noopener noreferrer" style={menuItem} onClick={() => setOpen(false)}>
              <span style={{ fontSize: 16 }}>📘</span> Facebook
            </a>
            <a href={x} target="_blank" rel="noopener noreferrer" style={menuItem} onClick={() => setOpen(false)}>
              <span style={{ fontSize: 16 }}>✖️</span> X (Twitter)
            </a>
            <a href={wa} target="_blank" rel="noopener noreferrer" style={menuItem} onClick={() => setOpen(false)}>
              <span style={{ fontSize: 16 }}>💬</span> WhatsApp
            </a>
            <button type="button" onClick={copyLink} style={{ ...menuItem, borderBottom: 'none' }}>
              <span style={{ fontSize: 16 }}>{copied ? '✓' : '🔗'}</span> {copied ? 'Link copied' : 'Copy link'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
