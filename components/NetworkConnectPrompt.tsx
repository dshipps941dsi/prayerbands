'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const GOLD = '#B8860B'
const DARK = '#2C1810'
const GRAY = '#7A6A5A'
const serif = "'Playfair Display', Georgia, serif"
const body = "'Lora', Georgia, serif"

type Status = {
  logged_in: boolean
  self?: boolean
  can_connect?: boolean
  recipient_name?: string
  viewer_is_band_holder?: boolean
  status?: 'none' | 'pending_sent' | 'pending_received' | 'accepted'
}

const cardStyle: React.CSSProperties = {
  margin: '20px 20px 0',
  background: 'white',
  border: `1px solid ${GOLD}`,
  borderRadius: 16,
  padding: '20px 22px',
  textAlign: 'center',
}

export default function NetworkConnectPrompt({ bandId }: { bandId: string }) {
  const router = useRouter()
  const [state, setState] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/network/status?bandId=${bandId}`)
      .then(r => r.json())
      .then(d => { if (active) { setState(d); setLoading(false) } })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [bandId])

  if (loading || !state) return null
  // Own band, or nobody with an account to connect to → no prompt.
  if (state.self) return null
  if (state.logged_in && state.can_connect === false) return null

  const title = (text: string) => (
    <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 6 }}>{text}</div>
  )
  const sub = (text: string) => (
    <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 14 }}>{text}</div>
  )
  const goldButton = (label: string, onClick: () => void, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{ display: 'inline-block', background: disabled ? '#ccc' : GOLD, color: '#0f0d09', border: 'none', borderRadius: 10, padding: '11px 26px', fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: disabled ? 'default' : 'pointer' }}>{label}</button>
  )

  const name = state.recipient_name || 'this person'

  // Not signed in
  if (!state.logged_in) {
    return (
      <div style={cardStyle}>
        {title('Connect in prayer')}
        {sub('Create an account to connect with this person in prayer.')}
        {goldButton('Create Account ✝', () => router.push(`/signin?redirect=/band/${bandId}`))}
      </div>
    )
  }

  // Signed in but not a band holder
  if (!state.viewer_is_band_holder) {
    return (
      <div style={cardStyle}>
        {title('Connect in prayer')}
        {sub('Register a band of your own to connect with others in prayer.')}
        {goldButton('Get a Band →', () => router.push('/store'))}
      </div>
    )
  }

  // Already connected
  if (state.status === 'accepted') {
    return (
      <div style={{ ...cardStyle, border: '1px solid rgba(44,24,16,0.12)' }}>
        <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: DARK }}>Already in your Prayer Partners 🙏</div>
      </div>
    )
  }

  // Request already sent (or just sent)
  if (sent || state.status === 'pending_sent') {
    return (
      <div style={{ ...cardStyle, border: '1px solid rgba(44,24,16,0.12)' }}>
        <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 4 }}>Request sent 🙏</div>
        <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic' }}>Waiting for {name} to accept.</div>
      </div>
    )
  }

  // They requested you
  if (state.status === 'pending_received') {
    return (
      <div style={cardStyle}>
        {title(`${name} wants to connect`)}
        {sub('Respond to this request from your dashboard.')}
        {goldButton('Review Request →', () => router.push('/dashboard?tab=prayers'))}
      </div>
    )
  }

  // No connection yet — offer to connect
  async function connect() {
    setWorking(true)
    try {
      const res = await fetch('/api/network/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ band_id: bandId }),
      })
      if (res.ok) setSent(true)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div style={cardStyle}>
      {title(`Connect with ${name} in prayer`)}
      {sub('Add them to your Prayer Partners so you can lift each other up.')}
      {goldButton(working ? 'Sending...' : 'Add to Prayer Partners', connect, working)}
    </div>
  )
}
