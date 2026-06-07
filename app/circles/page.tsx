'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

  async function handleLookup() {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setCircle(null)

    const res = await fetch(`/api/circles/lookup?code=${code.trim().toUpperCase()}`)
    const data = await res.json()

    if (!res.ok) {
      setError('No circle found with that code. Please check and try again.')
    } else {
      setCircle(data.circle)
    }
    setLoading(false)
  }

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
      router.push(`/signin?redirect=/circles&code=${circle.join_code}`)
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
      backgroundColor: '#FAF6EF',
      fontFamily: 'Georgia, serif',
      padding: '0 0 80px 0'
    }}>

      {/* Header */}
      <div style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #E8DCC8',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '22px',
            fontWeight: '700',
            color: '#2C1810',
            margin: 0
          }}>Prayer Circles</h1>
          <p style={{ fontSize: '13px', color: '#8B7355', margin: '2px 0 0 0' }}>
            Join a group or gather one
          </p>
        </div>
        <button
          onClick={() => router.push('/circles/new')}
          style={{
            backgroundColor: '#B8860B',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 18px',
            fontSize: '14px',
            fontFamily: 'Georgia, serif',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          + Create
        </button>
      </div>

      <div style={{ padding: '32px 24px 0 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* What is a circle */}
        {!circle && (
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #E8DCC8',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '28px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🙏</div>
            <p style={{
              fontSize: '15px',
              color: '#5C4033',
              lineHeight: '1.6',
              margin: 0
            }}>
              A Prayer Circle is a small group that gathers around a shared prayer need —
              a person healing, a family in crisis, a season of seeking.
              Someone creates the circle and shares a code. You enter it here to join.
            </p>
          </div>
        )}

        {/* Code entry */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #E8DCC8',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px'
        }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: '#8B7355',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}>
            Enter Join Code
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
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
                flex: 1,
                padding: '12px 16px',
                fontSize: '20px',
                letterSpacing: '0.2em',
                fontFamily: 'Georgia, serif',
                fontWeight: '700',
                color: '#2C1810',
                border: '2px solid #E8DCC8',
                borderRadius: '8px',
                backgroundColor: '#FAF6EF',
                outline: 'none',
                textTransform: 'uppercase'
              }}
            />
            <button
              onClick={handleLookup}
              disabled={loading || code.length < 4}
              style={{
                backgroundColor: code.length >= 4 ? '#2C1810' : '#D4C5B0',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '14px',
                fontFamily: 'Georgia, serif',
                fontWeight: '600',
                cursor: code.length >= 4 ? 'pointer' : 'default',
                whiteSpace: 'nowrap'
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
              marginBottom: 0
            }}>
              {error}
            </p>
          )}
        </div>

        {/* Circle preview card */}
        {circle && (
          <div style={{
            backgroundColor: '#fff',
            border: '2px solid #B8860B',
            borderRadius: '12px',
            padding: '24px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div>
                <p style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#B8860B',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  margin: '0 0 4px 0'
                }}>Circle Found</p>
                <h2 style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#2C1810',
                  margin: 0
                }}>{circle.name}</h2>
              </div>
              <div style={{
                backgroundColor: '#FAF6EF',
                border: '1px solid #E8DCC8',
                borderRadius: '8px',
                padding: '6px 12px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '18px', margin: 0 }}>🙏</p>
                <p style={{ fontSize: '11px', color: '#8B7355', margin: '2px 0 0 0' }}>
                  {circle.member_count} praying
                </p>
              </div>
            </div>

            {circle.description && (
              <p style={{
                fontSize: '15px',
                color: '#5C4033',
                lineHeight: '1.6',
                margin: '0 0 20px 0',
                fontStyle: 'italic'
              }}>
                "{circle.description}"
              </p>
            )}

            {joinError && (
              <p style={{
                color: '#C0392B',
                fontSize: '13px',
                marginBottom: '12px'
              }}>
                {joinError}
              </p>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              style={{
                width: '100%',
                backgroundColor: '#B8860B',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '16px',
                fontFamily: 'Playfair Display, Georgia, serif',
                fontWeight: '700',
                cursor: joining ? 'default' : 'pointer',
                opacity: joining ? 0.7 : 1
              }}
            >
              {joining ? 'Joining...' : 'Join This Circle'}
            </button>

            <p style={{
              fontSize: '12px',
              color: '#8B7355',
              textAlign: 'center',
              marginTop: '10px',
              marginBottom: 0
            }}>
              You'll need an account to join. We'll send you there if needed.
            </p>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}