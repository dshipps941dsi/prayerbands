'use client'

import { useState } from 'react'

// Inline purchase experience for the band page (no navigation away). Single-band
// gift checkout + monthly giving subscription, both wired to the existing Stripe
// checkout routes.

const GOLD = '#B8860B'
const DARK = '#2C1810'
const GRAY = '#8B7355'
const BORDER = '#E8DCC8'
const CREAM = '#FAF6EF'
const serif = 'Playfair Display, Georgia, serif'

// Displayed prices mirror the existing store ($5 single band) and the "monthly"
// subscription plan (Monthly Sender, $6.99/mo). Stripe is the source of truth for
// the actual charge.
const SINGLE_PRICE = '$5'
const SUB_PRICE = '$6.99'

export default function PurchaseTab({ bandId }: { bandId: string }) {
  const [showDedication, setShowDedication] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [note, setNote] = useState('')
  const [loadingSingle, setLoadingSingle] = useState(false)
  const [loadingSub, setLoadingSub] = useState(false)
  const [error, setError] = useState('')

  async function sendBand() {
    setLoadingSingle(true)
    setError('')
    try {
      const customMessage = recipient.trim()
        ? `For ${recipient.trim()}${note.trim() ? `: ${note.trim()}` : ''}`
        : note.trim()
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'standard', quantity: 1, customMessage }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Could not start checkout. Please try again.')
        setLoadingSingle(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoadingSingle(false)
    }
  }

  async function startGiving() {
    setLoadingSub(true)
    setError('')
    try {
      const res = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'monthly', bandColor: 'sky' }),
      })
      if (res.status === 401) {
        window.location.href = `/signin?redirect=/band/${bandId}`
        return
      }
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Could not start checkout. Please try again.')
        setLoadingSub(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoadingSub(false)
    }
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: GRAY, letterSpacing: '0.06em', marginBottom: 6 }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: 'Georgia, serif', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, backgroundColor: CREAM, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: DARK, marginBottom: 6 }}>Give a Prayer Band</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>
        Keep the chain going — send a band, or become a monthly giver.
      </div>

      {/* Card 1 — Single Band */}
      <div style={{ backgroundColor: '#fff', border: `1px solid ${GOLD}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 4 }}>Send a Band to Someone</div>
            <div style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', lineHeight: 1.5 }}>A physical act of prayer, sent to someone on your heart.</div>
          </div>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: GOLD, whiteSpace: 'nowrap' }}>{SINGLE_PRICE}</div>
        </div>

        {!showDedication && (
          <button onClick={() => setShowDedication(true)} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 13, fontFamily: 'Georgia, serif', cursor: 'pointer', padding: '12px 0 4px', textDecoration: 'underline' }}>
            + Add a dedication
          </button>
        )}

        {showDedication && (
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Who is this for?</label>
            <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Recipient's name" maxLength={80} style={{ ...inputStyle, marginBottom: 12 }} />
            <label style={labelStyle}>A note from you</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="A short message or prayer..." maxLength={200} rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
            <div style={{ fontSize: 11, color: '#B0A090', textAlign: 'right', marginTop: 4 }}>{note.length}/200</div>
          </div>
        )}

        <button onClick={sendBand} disabled={loadingSingle} style={{ width: '100%', marginTop: 16, backgroundColor: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10, padding: 14, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: loadingSingle ? 'default' : 'pointer', opacity: loadingSingle ? 0.7 : 1 }}>
          {loadingSingle ? 'Starting checkout...' : 'Send This Band →'}
        </button>
      </div>

      {/* Card 2 — Monthly Giving Subscription */}
      <div style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 4 }}>Become a Monthly Sender</div>
            <div style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', lineHeight: 1.5 }}>Receive a new band each month to give away.</div>
          </div>
          <div style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
            <span style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: DARK }}>{SUB_PRICE}</span>
            <span style={{ fontSize: 12, color: GRAY }}>/mo</span>
          </div>
        </div>
        <button onClick={startGiving} disabled={loadingSub} style={{ width: '100%', marginTop: 16, backgroundColor: 'transparent', color: DARK, border: `1.5px solid ${GOLD}`, borderRadius: 10, padding: 14, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: loadingSub ? 'default' : 'pointer', opacity: loadingSub ? 0.7 : 1 }}>
          {loadingSub ? 'Starting...' : 'Start Giving →'}
        </button>
      </div>

      {error && <div style={{ color: '#C0392B', fontSize: 13, textAlign: 'center', marginTop: 14 }}>{error}</div>}

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <a href="/register" style={{ fontSize: 13, color: GRAY, textDecoration: 'underline' }}>Already have a band to register?</a>
      </div>
    </div>
  )
}
