'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

interface CirclePreview {
  id: string
  name: string
  description: string | null
  join_code: string
  member_count: number
  created_at: string
}

export default function CirclesPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [circle, setCircle] = useState<CirclePreview | null>(null)
  const [error, setError] = useState('')
  const [joinError, setJoinError] = useState('')

  async function handleLookup(lookupCode?: string) {
    const c = (lookupCode ?? code).trim().toUpperCase()
    if (!c) return
    setLoading(true)
    setError('')
    setCircle(null)

    const res = await fetch(`/api/circles/lookup?code=${c}`)
    const data = await res.json()

    if (!res.ok) {
      setError('No circle found with that code. Please check and try again.')
    } else {
      setCircle(data.circle)
    }
    setLoading(false)
  }

  // Pre-fill (and look up) a code passed via the share link: /circles?code=GRACE7
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('code')
    if (fromUrl) {
      const clean = fromUrl.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      if (clean) {
        setCode(clean)
        handleLookup(clean)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleJoin() {
    if (!circle) return
    setJoining(true)
    setJoinError('')

    const res = await fetch('/api/circles/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circle_id: circle.id })
    })

    const data = await res.json()

    if (res.status === 401) {
      router.push(`/signin/personal?redirect=${encodeURIComponent(`/circles/${circle.id}?code=${circle.join_code}`)}`)
      return
    }

    if (res.status === 409) {
      // Already a member — just go to the circle
      router.push(`/circles/${circle.id}`)
      return
    }

    if (!res.ok) {
      setJoinError(data.error || 'Failed to join. Please try again.')
      setJoining(false)
      return
    }

    router.push(`/circles/${circle.id}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F6F1E4',
      fontFamily: "'Inter', sans-serif",
      padding: '0 0 80px 0'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        backgroundColor: '#FFFDF8',
        borderBottom: '1px solid rgba(10,22,40,0.12)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <PrayerBandsLogo size={34} color="#C8A96E" />
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '22px',
              fontWeight: '700',
              color: '#15223B',
              margin: 0
            }}>Prayer Circles</h1>
            <p style={{ fontSize: '13px', color: '#5C6573', margin: '2px 0 0 0', fontFamily: "'Inter', sans-serif" }}>
              Join a group or gather one
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/circles/new')}
          style={{
            backgroundColor: '#C8A96E',
            color: '#0A1628',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 18px',
            fontSize: '12px',
            fontFamily: "'Cinzel', serif",
            cursor: 'pointer',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}
        >
          + Create
        </button>
      </div>

      <div style={{ padding: '32px 24px 0 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* What is a circle */}
        {!circle && (
          <div style={{
            backgroundColor: '#FFFDF8',
            border: '1px solid rgba(200,169,110,0.34)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '28px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🙏</div>
            <p style={{
              fontSize: '15px',
              color: '#2A3344',
              lineHeight: '1.6',
              margin: 0,
              fontFamily: "'Inter', sans-serif"
            }}>
              A Prayer Circle is a small group that gathers around a shared prayer need —
              a person healing, a family in crisis, a season of seeking.
              Someone creates the circle and shares a code. You enter it here to join.
            </p>
          </div>
        )}

        {/* Code entry */}
        <div style={{
          backgroundColor: '#FFFDF8',
          border: '1px solid rgba(10,22,40,0.12)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(10,22,40,0.06)'
        }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: '600',
            color: '#9A7A35',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            marginBottom: '10px',
            fontFamily: "'Cinzel', serif"
          }}>
            Enter Join Code
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={code}
              onChange={e => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                setError('')
                setCircle(null)
              }}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              maxLength={6}
              placeholder="GRACE7"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 16px',
                fontSize: '20px',
                letterSpacing: '0.2em',
                fontFamily: "'Cinzel', serif",
                fontWeight: '700',
                color: '#15223B',
                border: '2px solid rgba(200,169,110,0.34)',
                borderRadius: '8px',
                backgroundColor: '#F6F1E4',
                outline: 'none',
                textTransform: 'uppercase'
              }}
            />
            <button
              onClick={() => handleLookup()}
              disabled={loading || code.length < 4}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: code.length >= 4 ? '#C8A96E' : '#C9CFD6',
                color: code.length >= 4 ? '#0A1628' : '#5C6573',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 20px',
                fontSize: '12px',
                fontFamily: "'Cinzel', serif",
                fontWeight: '600',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: code.length >= 4 ? 'pointer' : 'default'
              }}
            >
              {loading ? 'Looking...' : 'Find Circle'}
            </button>
          </div>

          {error && (
            <p style={{
              color: '#C0392B',
              fontSize: '13px',
              marginTop: '10px',
              marginBottom: 0,
              fontFamily: "'Inter', sans-serif"
            }}>
              {error}
            </p>
          )}
        </div>

        {/* Circle preview card */}
        {circle && (
          <div style={{
            backgroundColor: '#FFFDF8',
            border: '2px solid rgba(200,169,110,0.34)',
            borderRadius: '12px',
            padding: '24px',
            animation: 'fadeIn 0.3s ease',
            boxShadow: '0 4px 16px rgba(10,22,40,0.08)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div>
                <p style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#9A7A35',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  margin: '0 0 4px 0',
                  fontFamily: "'Cinzel', serif"
                }}>Circle Found</p>
                <h2 style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#15223B',
                  margin: 0
                }}>{circle.name}</h2>
              </div>
              <div style={{
                backgroundColor: '#F6F1E4',
                border: '1px solid rgba(92,101,115,0.20)',
                borderRadius: '8px',
                padding: '6px 12px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '18px', margin: 0 }}>🙏</p>
                <p style={{ fontSize: '11px', color: '#5C6573', margin: '2px 0 0 0', fontFamily: "'Inter', sans-serif" }}>
                  {circle.member_count} praying
                </p>
              </div>
            </div>

            {circle.description && (
              <p style={{
                fontSize: '15px',
                color: '#2A3344',
                lineHeight: '1.6',
                margin: '0 0 20px 0',
                fontStyle: 'italic',
                fontFamily: "'Cormorant Garamond', Georgia, serif"
              }}>
                "{circle.description}"
              </p>
            )}

            {joinError && (
              <p style={{
                color: '#C0392B',
                fontSize: '13px',
                marginBottom: '12px',
                fontFamily: "'Inter', sans-serif"
              }}>
                {joinError}
              </p>
            )}

            <button
              onClick={() => router.push(`/circles/${circle.id}?code=${circle.join_code}`)}
              style={{
                width: '100%',
                backgroundColor: '#C8A96E',
                color: '#0A1628',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '13px',
                fontFamily: "'Cinzel', serif",
                fontWeight: '600',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              View Circle →
            </button>

            <button
              onClick={handleJoin}
              disabled={joining}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                color: '#9A7A35',
                border: '1px solid rgba(200,169,110,0.45)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '12px',
                fontFamily: "'Cinzel', serif",
                fontWeight: '600',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: joining ? 'default' : 'pointer',
                opacity: joining ? 0.7 : 1,
                marginTop: '10px'
              }}
            >
              {joining ? 'Joining...' : 'Join This Circle'}
            </button>

            <p style={{
              fontSize: '12px',
              color: '#5C6573',
              textAlign: 'center',
              marginTop: '10px',
              marginBottom: 0,
              fontFamily: "'Inter', sans-serif"
            }}>
              No account needed to view. Sign in to share a request or pray.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}