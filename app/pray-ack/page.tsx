'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function PrayAckInner() {
  const searchParams = useSearchParams()
  const id = searchParams?.get('id')
const name = searchParams?.get('name')
const email = searchParams?.get('email')
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [requesterName, setRequesterName] = useState('')

  useEffect(() => {
    if (!id || !email) { setStatus('error'); return }
    fetch('/api/pray-ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainPrayerId: id, acknowledgerName: name, acknowledgerEmail: email })
    })
      .then(r => r.json())
      .then(d => {
        setRequesterName(d.requesterName || 'your friend')
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [id, email, name])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f4ef', fontFamily: 'Georgia, serif', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '48px 40px', maxWidth: 440, width: '100%', border: '1px solid #e8e1d6', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', textAlign: 'center' }}>
        {status === 'loading' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✝</div>
            <div style={{ fontSize: 16, color: '#8a7c6a' }}>Recording your prayer...</div>
          </div>
        )}
        {status === 'done' && (
          <div>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🙏</div>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1208', marginBottom: 12 }}>Thank you for praying!</h1>
            <p style={{ fontSize: 15, color: '#5a4f42', lineHeight: 1.7, marginBottom: 24 }}>
              <strong>{requesterName}</strong> has been notified that you're standing with them in prayer. ✝
            </p>
            <div style={{ background: '#f0f7f3', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#5a4f42', fontStyle: 'italic', margin: 0 }}>
                "Again, truly I tell you that if two of you on earth agree about anything they ask for, it will be done for them by my Father in heaven." — Matthew 18:19
              </p>
            </div>
            <a href="https://prayerbands.com" style={{ display: 'inline-block', background: '#1a6b4a', color: '#fff', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 'bold' }}>
              Visit PrayerBands ✝
            </a>
          </div>
        )}
        {status === 'error' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✝</div>
            <h1 style={{ fontSize: 20, fontWeight: 'bold', color: '#1a1208', marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#8a7c6a' }}>This prayer acknowledgment link may have expired.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PrayAckPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: '#8a7c6a' }}>✝</div>}>
      <PrayAckInner />
    </Suspense>
  )
}
