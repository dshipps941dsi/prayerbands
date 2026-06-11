'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import SiteHeader from '../../components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

const MAX_NOTE = 300

function DedicateInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const bandId = String(params?.bandId || '')
  const token = searchParams?.get('token') || ''

  const [state, setState] = useState<'checking' | 'valid' | 'invalid' | 'saved'>('checking')
  const [recipient, setRecipient] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      if (!bandId || !token) { setState('invalid'); return }
      try {
        const res = await fetch(`/api/validate-dedication-token?bandId=${encodeURIComponent(bandId)}&token=${encodeURIComponent(token)}`)
        if (!res.ok) { setState('invalid'); return }
        const data = await res.json()
        if (!data.valid) { setState('invalid'); return }
        if (data.dedication_recipient) setRecipient(data.dedication_recipient)
        if (data.dedication_note) setNote(data.dedication_note)
        setState('valid')
      } catch {
        setState('invalid')
      }
    })()
  }, [bandId, token])

  async function submit() {
    setError('')
    if (!note.trim() && !recipient.trim()) { setError('Add a recipient name or a message.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/save-dedications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, token, dedication_recipient: recipient, dedication_note: note }),
      })
      if (res.ok) setState('saved')
      else setError('Could not save. Please check your link and try again.')
    } catch {
      setError('Network error. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div style={{ background: '#F6F1E4', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#2A3344' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .ded-hero { text-align: center; padding: 64px 24px 48px;
          background: radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%), linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%);
          border-bottom: 1px solid rgba(200,169,110,0.34); }
        .ded-eyebrow { font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: #C8A96E; margin-bottom: 14px; }
        .ded-title { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: clamp(30px, 5vw, 46px); line-height: 1.12; color: #F5EDD8; }
        .ded-sub { font-size: 15px; font-weight: 300; color: rgba(245,237,216,0.78); max-width: 480px; margin: 14px auto 0; line-height: 1.7; }
        .ded-wrap { max-width: 540px; margin: 0 auto; padding: 40px 24px 72px; }
        .ded-card { background: #FFFDF8; border: 1px solid rgba(200,169,110,0.30); border-radius: 12px; padding: 28px 26px; box-shadow: 0 2px 14px rgba(10,22,40,0.06); }
        .ded-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #9A7A35; font-family: 'Cinzel', serif; margin-bottom: 7px; }
        .ded-input { width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 15px; border: 1px solid rgba(10,22,40,0.15); border-radius: 8px; background: #F6F1E4; color: #15223B; outline: none; font-family: 'Inter', sans-serif; margin-bottom: 18px; }
        .ded-input:focus, .ded-textarea:focus { border-color: #C8A96E; }
        .ded-textarea { width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 15px; border: 1px solid rgba(10,22,40,0.15); border-radius: 8px; background: #F6F1E4; color: #15223B; outline: none; font-family: 'Cormorant Garamond', Georgia, serif; line-height: 1.6; resize: vertical; min-height: 110px; }
        .ded-count { font-size: 12px; color: #5C6573; text-align: right; margin: 6px 0 18px; }
        .ded-btn { width: 100%; background: #0E1E38; color: #F5EDD8; border: 1px solid rgba(200,169,110,0.45); border-radius: 10px; padding: 14px; font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; }
        .ded-btn:disabled { opacity: 0.6; cursor: default; }
        .ded-err { color: #C0392B; font-size: 13px; margin-top: 12px; text-align: center; }
        .ded-msg { text-align: center; color: #5C6573; padding: 30px 0; }
      `}</style>

      <SiteHeader />

      <section className="ded-hero">
        <div className="ded-eyebrow">✝ Add a Dedication</div>
        <h1 className="ded-title">Send a Personal Message</h1>
        <p className="ded-sub">Leave a note that the recipient will see the very first time they tap their band.</p>
      </section>

      <div className="ded-wrap">
        {state === 'checking' && <div className="ded-msg">Checking your link…</div>}

        {state === 'invalid' && (
          <div className="ded-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 700, color: '#15223B', marginBottom: 8 }}>This link isn&rsquo;t valid</div>
            <p style={{ fontSize: 14, color: '#5C6573', lineHeight: 1.6 }}>The dedication link may be incorrect or expired. Please use the link from your shipping confirmation email.</p>
          </div>
        )}

        {state === 'valid' && (
          <div className="ded-card">
            <label className="ded-label">Recipient&rsquo;s Name</label>
            <input className="ded-input" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Who is this band for?" />

            <label className="ded-label">Personal Message</label>
            <textarea
              className="ded-textarea"
              value={note}
              onChange={e => setNote(e.target.value.slice(0, MAX_NOTE))}
              placeholder="Write something they'll read on their first tap — a blessing, a verse, why you're praying for them…"
            />
            <div className="ded-count">{note.length}/{MAX_NOTE}</div>

            <button className="ded-btn" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Dedication'}</button>
            {error && <div className="ded-err">{error}</div>}
            <div style={{ textAlign: 'center', fontSize: 12, color: '#8A8170', marginTop: 14, fontFamily: 'monospace' }}>{bandId}</div>
          </div>
        )}

        {state === 'saved' && (
          <div className="ded-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12, color: '#C8A96E' }}>✝</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 700, color: '#15223B', marginBottom: 8 }}>Your message is saved</div>
            <p style={{ fontSize: 15, color: '#5C6573', lineHeight: 1.7 }}>
              When {recipient ? recipient : 'they'} taps this band for the first time, your dedication will be waiting. 🙏
            </p>
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}

export default function DedicatePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F6F1E4' }} />}>
      <DedicateInner />
    </Suspense>
  )
}
