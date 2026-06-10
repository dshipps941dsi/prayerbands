'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface CircleSummary {
  id: string
  name: string
  join_code: string
  is_closed: boolean
  my_role: 'leader' | 'member'
  member_count: number
  open_request_count: number
}

export default function CirclesSection({ userId }: { userId: string }) {
  const router = useRouter()
  const [circles, setCircles] = useState<CircleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [isBandHolder, setIsBandHolder] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/circles/my-circles')
      if (res.ok) {
        const data = await res.json()
        setCircles(data.circles ?? [])
        setIsBandHolder(data.is_band_holder ?? false)
      }
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) {
    return (
      <div style={{ padding: '20px 0', color: 'var(--pb-text-muted, #8B7355)', fontSize: '14px', textAlign: 'center' }}>
        Loading circles...
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '32px' }}>

      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px'
      }}>
        <h3 style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '17px',
          fontWeight: '700',
          color: 'var(--pb-text, #2C1810)',
          margin: 0
        }}>
          Prayer Circles
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => router.push('/circles')}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--pb-border, #D4C5B0)',
              borderRadius: '16px',
              padding: '5px 12px',
              fontSize: '12px',
              fontFamily: 'Georgia, serif',
              color: 'var(--pb-text-muted, #8B7355)',
              cursor: 'pointer'
            }}
          >
            Join
          </button>
          {isBandHolder && (
            <button
              onClick={() => router.push('/circles/new')}
              style={{
                backgroundColor: 'var(--pb-primary, #B8860B)',
                border: 'none',
                borderRadius: '16px',
                padding: '5px 12px',
                fontSize: '12px',
                fontFamily: 'Georgia, serif',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Create
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {circles.length === 0 && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px dashed var(--pb-border, #D4C5B0)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '24px', margin: '0 0 8px 0' }}>🙏</p>
          <p style={{ fontSize: '14px', color: 'var(--pb-text-muted, #8B7355)', margin: '0 0 14px 0', lineHeight: '1.5' }}>
            You're not in any Prayer Circles yet.
            {isBandHolder
              ? ' Create one for someone who needs prayer, or join one with a code.'
              : ' Enter a join code to gather around someone in need.'}
          </p>
          <button
            onClick={() => router.push('/circles')}
            style={{
              backgroundColor: 'var(--pb-primary, #B8860B)',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 20px',
              fontSize: '13px',
              fontFamily: 'Georgia, serif',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Enter a Join Code
          </button>
        </div>
      )}

      {/* Circle cards */}
      {circles.map(circle => (
        <div
          key={circle.id}
          onClick={() => router.push(`/circles/${circle.id}`)}
          style={{
            backgroundColor: '#fff',
            border: '1px solid var(--pb-border, #E8DCC8)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'border-color 0.15s'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <p style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '15px',
                fontWeight: '700',
                color: 'var(--pb-text, #2C1810)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {circle.name}
              </p>
              {circle.my_role === 'leader' && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: 'var(--pb-primary, #B8860B)',
                  backgroundColor: '#FFF8E7',
                  border: '1px solid #F0D080',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  whiteSpace: 'nowrap'
                }}>
                  Leader
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--pb-text-muted, #8B7355)', margin: 0 }}>
              {circle.member_count} {circle.member_count === 1 ? 'person' : 'people'} praying
              {circle.open_request_count > 0 && (
                <span style={{ color: 'var(--pb-primary, #B8860B)', fontWeight: '600' }}>
                  {' · '}{circle.open_request_count} open {circle.open_request_count === 1 ? 'request' : 'requests'}
                </span>
              )}
            </p>
          </div>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.12em',
            color: 'var(--pb-border, #D4C5B0)',
            marginLeft: '12px'
          }}>
            {circle.join_code}
          </div>
          <span style={{ marginLeft: '8px', color: 'var(--pb-border, #D4C5B0)', fontSize: '16px' }}>›</span>
        </div>
      ))}

    </div>
  )
}