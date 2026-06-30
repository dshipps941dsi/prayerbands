'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const NAVY = '#0A1628'
const GOLD = '#C8A96E'
const CREAM = '#F5EDD8'

function UnsubscribeInner() {
  const sp = useSearchParams()
  const email = sp?.get('e') || ''
  const scope = sp?.get('s') || ''
  const token = sp?.get('t') || ''
  const isAll = scope === 'all'

  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function confirm() {
    setState('working')
    try {
      const res = await fetch(`/api/unsubscribe?e=${encodeURIComponent(email)}&s=${encodeURIComponent(scope)}&t=${encodeURIComponent(token)}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg(data.error || 'Could not process your request.'); setState('error'); return }
      setState('done')
    } catch {
      setMsg('Network error. Please try again.'); setState('error')
    }
  }

  const card: React.CSSProperties = {
    background: '#FFFDF8', borderRadius: 16, padding: '40px 32px', maxWidth: 440, width: '100%',
    border: '1px solid rgba(200,169,110,0.34)', boxShadow: '0 4px 32px rgba(10,22,40,0.18)', textAlign: 'center',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(180deg, ${NAVY} 0%, #0E1E38 55%, ${NAVY} 100%)`, fontFamily: "'Inter', sans-serif", padding: '24px 16px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=Inter:wght@300;400;500;600&display=swap');`}</style>
      <div style={card}>
        <div style={{ fontSize: 40, color: GOLD, marginBottom: 14 }}>✝</div>

        {state === 'done' ? (
          <>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#15223B', margin: '0 0 10px' }}>You&apos;re unsubscribed</h1>
            <p style={{ fontSize: 14, color: '#5C6573', lineHeight: 1.6, margin: 0 }}>
              {isAll
                ? <><strong>{email}</strong> will no longer receive prayer-request emails from Prayer Bands.</>
                : <><strong>{email}</strong> will no longer receive prayer requests from this person. You&apos;ll still get requests from anyone else you&apos;ve shared a band with.</>}
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#15223B', margin: '0 0 10px' }}>
              {isAll ? 'Unsubscribe from prayer emails?' : 'Stop these prayer requests?'}
            </h1>
            <p style={{ fontSize: 14, color: '#5C6573', lineHeight: 1.6, margin: '0 0 24px' }}>
              {isAll
                ? <>Stop sending all Prayer Bands prayer-request emails to <strong>{email}</strong>.</>
                : <>Stop sending prayer requests from this person to <strong>{email}</strong>. You&apos;ll still receive requests from anyone else you&apos;ve shared a band with.</>}
            </p>
            {state === 'error' && <div style={{ background: '#fef0f0', border: '1px solid #f5c6c6', borderRadius: 7, padding: '10px 14px', color: '#c0392b', fontSize: 13, marginBottom: 16 }}>{msg}</div>}
            <button onClick={confirm} disabled={state === 'working' || !email || !token} style={{ width: '100%', padding: '13px', borderRadius: 8, background: GOLD, color: NAVY, border: 'none', fontSize: 12, fontWeight: 700, cursor: state === 'working' ? 'wait' : 'pointer', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {state === 'working' ? 'Working…' : (isAll ? 'Unsubscribe from all' : 'Stop these requests')}
            </button>
            <a href="/" style={{ display: 'inline-block', marginTop: 16, fontSize: 13, color: '#9A7A35', textDecoration: 'none', fontWeight: 600 }}>No thanks, keep me subscribed</a>
          </>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: NAVY, color: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif" }}>Loading… ✝</div>}>
      <UnsubscribeInner />
    </Suspense>
  )
}
