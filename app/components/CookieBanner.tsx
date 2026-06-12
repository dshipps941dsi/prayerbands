'use client'
import { useEffect, useState } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('pb_privacy_accepted')
    if (!accepted) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('pb_privacy_accepted', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
      background: '#2C1A0E', borderTop: '1px solid #C8A96E33',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '16px', flexWrap: 'wrap',
    }}>
      <p style={{
        fontFamily: 'Lato, sans-serif', fontSize: '13px',
        color: 'rgba(253,250,245,0.7)', margin: 0, lineHeight: 1.6,
        flex: 1, minWidth: '200px',
      }}>
        ✝ Prayer Bands uses browser storage to remember your band registrations and show you daily verses.
        We never sell your data.{' '}
        <a href="/privacy" style={{ color: '#C8A96E', textDecoration: 'underline' }}>
          Privacy Policy
        </a>
      </p>
      <button
        onClick={accept}
        style={{
          background: '#C8A96E', color: '#fff', border: 'none',
          padding: '9px 24px', borderRadius: '4px',
          fontFamily: 'Lato, sans-serif', fontSize: '12px',
          fontWeight: '700', letterSpacing: '0.1em',
          textTransform: 'uppercase', cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Got It ✝
      </button>
    </div>
  )
}