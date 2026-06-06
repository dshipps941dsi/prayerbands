'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const GOLD  = '#B8860B'
const GREEN = '#1a4a3a'
const NAVY  = '#1a2a4a'
const DARK  = '#2C1810'
const CREAM = '#FAF6EF'
const GRAY  = '#7A6A5A'
const serif = "'Playfair Display', Georgia, serif"
const body  = "'Lora', Georgia, serif"

type BandDedication = {
  bandId: string
  recipientName: string
  note: string
  saved: boolean
}

function OrderSuccessInner() {
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get('session_id') ?? null

  const [loading, setLoading] = useState(true)
  const [orderData, setOrderData] = useState<any>(null)
  const [dedications, setDedications] = useState<BandDedication[]>([])
  const [allSaved, setAllSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!sessionId) { setLoading(false); return }
    fetch(`/api/order-details?session_id=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        setOrderData(data)
        // Build one dedication card per band
        const bands = data.bands ?? []
        setDedications(bands.map((b: string) => ({
          bandId: b,
          recipientName: '',
          note: '',
          saved: false,
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sessionId])

  async function saveDedications() {
    setSaving(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await supabase.auth.getUser()

    await fetch('/api/save-dedications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dedications, userId: user?.id ?? null }),
    })

    setAllSaved(true)
    setSaving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CREAM, fontFamily: body }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, color: GOLD, marginBottom: 16 }}>✝</div>
        <div style={{ fontSize: 16, color: GRAY, fontStyle: 'italic' }}>Confirming your order...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: body, color: DARK }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(44,24,16,0.1)', background: 'rgba(250,246,239,0.97)' }}>
        <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: DARK }}>
          ✝ Prayer<span style={{ color: GOLD }}>Bands</span>
        </span>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✝</div>
          <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Order Confirmed</div>
          <div style={{ fontFamily: body, fontSize: 15, color: GRAY, fontStyle: 'italic', lineHeight: 1.6 }}>
            Your bands are on their way. Before they ship, dedicate each one to the person you're giving it to.
          </div>
        </div>

        {allSaved ? (
          /* All saved state */
          <div style={{ background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`, borderRadius: 16, padding: '32px 24px', textAlign: 'center', color: 'white', marginBottom: 24 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🙏</div>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Bands dedicated</div>
            <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.6 }}>
              When each person taps their band for the first time, they'll see your name and your prayer. The journey has already begun.
            </div>
          </div>
        ) : (
          <>
            {/* Dedication cards */}
            {dedications.length > 0 ? (
              <>
                {dedications.map((d, i) => (
                  <div key={d.bandId} style={{ background: 'white', borderRadius: 16, padding: '24px', marginBottom: 16, border: '1px solid rgba(44,24,16,0.1)', boxShadow: '0 4px 20px rgba(44,24,16,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>{i + 1}</div>
                      <div>
                        <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700 }}>Band {d.bandId}</div>
                        <div style={{ fontFamily: body, fontSize: 12, color: GRAY }}>Who is this band for?</div>
                      </div>
                    </div>

                    <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Recipient name (optional)</label>
                    <input
                      value={d.recipientName}
                      onChange={e => setDedications(prev => prev.map((x, j) => j === i ? { ...x, recipientName: e.target.value } : x))}
                      placeholder="e.g. Emma, my daughter"
                      style={{ display: 'block', width: '100%', padding: '10px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
                    />

                    <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your prayer for them (optional)</label>
                    <textarea
                      value={d.note}
                      onChange={e => setDedications(prev => prev.map((x, j) => j === i ? { ...x, note: e.target.value } : x))}
                      placeholder="e.g. I pray this band reminds you that you are loved and never alone..."
                      rows={3}
                      style={{ display: 'block', width: '100%', padding: '10px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

                <button
                  onClick={saveDedications}
                  disabled={saving}
                  style={{ display: 'block', width: '100%', padding: 16, background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 12, fontFamily: serif, fontSize: 17, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}
                >
                  {saving ? 'Saving dedications...' : 'Save & dedicate these bands ✝'}
                </button>
                <button
                  onClick={() => setAllSaved(true)}
                  style={{ display: 'block', width: '100%', padding: 12, background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 12, fontFamily: body, fontSize: 14, cursor: 'pointer', marginBottom: 24 }}
                >
                  Skip — I'll dedicate later
                </button>
              </>
            ) : (
              /* No bands found — show generic success */
              <div style={{ background: 'white', borderRadius: 16, padding: '28px 24px', marginBottom: 24, border: '1px solid rgba(44,24,16,0.1)', textAlign: 'center' }}>
                <div style={{ fontFamily: body, fontSize: 14, color: GRAY, fontStyle: 'italic', lineHeight: 1.6 }}>
                  Your bands will be assigned IDs when they ship. You'll receive an email with a link to dedicate each one.
                </div>
              </div>
            )}
          </>
        )}

        {/* What happens next */}
        <div style={{ background: 'white', borderRadius: 14, padding: '20px 24px', border: '1px solid rgba(44,24,16,0.1)', marginBottom: 16 }}>
          <div style={{ fontFamily: body, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: GOLD, marginBottom: 14 }}>What Happens Next</div>
          {[
            'You receive a confirmation email',
            'Your bands ship within 3–5 business days',
            'Each band is NFC-programmed and ready to give',
            'When someone taps it, they see your name and prayer',
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontSize: 11, fontWeight: 700, color: '#0f0d09', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontFamily: body, fontSize: 14, color: DARK, lineHeight: 1.5 }}>{s}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href="/dashboard" style={{ display: 'block', textAlign: 'center', background: NAVY, color: 'white', padding: '14px 24px', borderRadius: 10, textDecoration: 'none', fontFamily: serif, fontSize: 15, fontWeight: 700 }}>Go to Dashboard ✝</a>
          <a href="/store" style={{ display: 'block', textAlign: 'center', background: 'transparent', color: GRAY, padding: '12px 24px', borderRadius: 10, textDecoration: 'none', fontFamily: body, fontSize: 14, border: '1px solid rgba(44,24,16,0.15)' }}>Order More Bands</a>
        </div>

      </div>
    </div>
  )
}

export default function OrderSuccess() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF6EF' }}><div style={{ fontSize: 48, textAlign: 'center' }}>✝</div></div>}>
      <OrderSuccessInner />
    </Suspense>
  )
}
