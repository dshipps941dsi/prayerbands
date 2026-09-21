'use client'

import { useState } from 'react'

// Share buttons for a blog post: Pinterest (with the post's tall pin image),
// Facebook, X, email, copy link, and the phone's own share sheet where it
// exists. Plain links, so they work with no JavaScript and open in a new tab.

const GOLD = '#C8A96E'
const NAVY = '#15223B'

export default function ShareRow({ url, title, description, image, compact = false }: { url: string; title: string; description?: string; image?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const u = encodeURIComponent(url), t = encodeURIComponent(title), d = encodeURIComponent(description || '')
  const links = [
    { key: 'pinterest', label: 'Pinterest', href: `https://pinterest.com/pin/create/button/?url=${u}&media=${encodeURIComponent(image || '')}&description=${t}`, glyph: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12c0 4.1 2.5 7.7 6.1 9.2-.1-.8-.2-2 0-2.8l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.3-4.5-4.3-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4.1.1.1.2.1.3l-.3 1.2c0 .2-.2.2-.4.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8.9.3 1.9.4 2.9.4 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg> },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, glyph: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8h3.3z"/></svg> },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, glyph: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 3h3.1l-6.8 7.8L21.8 21h-6.3l-4.9-6.4L4.9 21H1.8l7.3-8.3L1.4 3h6.4l4.4 5.9L17.5 3zm-1.1 16.2h1.7L6.9 4.7H5.1l11.3 14.5z"/></svg> },
    { key: 'email', label: 'Email', href: `mailto:?subject=${t}&body=${d}%0A%0A${u}`, glyph: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> },
  ]

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }
  async function native() {
    try { await (navigator as any).share({ title, text: description, url }) } catch {}
  }
  const canNative = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function'

  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: compact ? '7px 11px' : '9px 14px', borderRadius: 999,
    border: `1px solid rgba(200,169,110,0.55)`, background: '#FFFDF8', color: NAVY, textDecoration: 'none',
    fontFamily: 'Inter, system-ui, sans-serif', fontSize: compact ? 12.5 : 13.5, fontWeight: 600, cursor: 'pointer', lineHeight: 1,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} aria-label="Share this post">
      {!compact && <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD, marginRight: 4 }}>Share</span>}
      {links.map(l => (
        <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer" style={btn} aria-label={`Share on ${l.label}`}>{l.glyph}{l.label}</a>
      ))}
      <button onClick={copy} style={btn} aria-label="Copy link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/></svg>
        {copied ? 'Copied' : 'Copy link'}
      </button>
      {canNative && (
        <button onClick={native} style={btn} aria-label="Share">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>
          More
        </button>
      )}
    </div>
  )
}
