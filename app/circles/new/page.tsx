'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewCirclePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsAccount, setNeedsAccount] = useState(false)
  const [created, setCreated] = useState<{ id: string; join_code: string } | null>(null)
  const [copied, setCopied] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/circles/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() })
    })

    const data = await res.json()

    if (res.status === 401) {
      setNeedsAccount(true)
      setLoading(false)
      return
    }

    if (res.status === 403) {
      setError('Only band holders can create a Prayer Circle. Register a band first.')
      setLoading(false)
      return
    }

    if (!res.ok) {
      setError(data.details ? `${data.error}: ${data.details}` : (data.error || 'Something went wrong. Please try again.'))
      setLoading(false)
      return
    }

    setCreated({ id: data.circle.id, join_code: data.circle.join_code })
    setLoading(false)
  }

  function copy(value: string, which: string) {
    navigator.clipboard.writeText(value)
    setCopied(which)
    setTimeout(() => setCopied(''), 2000)
  }

  // ── Confirmation screen (after a circle is created) ──
  if (created) {
    const link = `https://prayerbands.com/circles?code=${created.join_code}`
    const shareText = `Join my Prayer Circle on PrayerBands. Enter code ${created.join_code} at ${link}`
    const shareOption = (label: string, onClick: () => void, href?: string) => {
      const style: React.CSSProperties = { display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', backgroundColor: '#fff', border: '1px solid #E8DCC8', borderRadius: 10, padding: '13px', fontSize: 14, fontFamily: 'Georgia, serif', color: '#2C1810', cursor: 'pointer', textDecoration: 'none', marginBottom: 10 }
      return href
        ? <a href={href} style={style}>{label}</a>
        : <button onClick={onClick} style={style}>{label}</button>
    }
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAF6EF', fontFamily: 'Georgia, serif', padding: '0 0 80px 0' }}>
        <div style={{ padding: '48px 24px 0', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40, color: '#7BAE8E', marginBottom: 12 }}>✓</div>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 26, fontWeight: 700, color: '#2C1810', margin: '0 0 8px' }}>Circle Created!</h1>
          <p style={{ fontSize: 14, color: '#8B7355', margin: '0 0 28px', lineHeight: 1.5 }}>Share this code so others can join your circle.</p>

          <div style={{ backgroundColor: '#fff', border: '2px solid #B8860B', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#B8860B', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Join Code</div>
            <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 36, fontWeight: 700, letterSpacing: '0.25em', color: '#2C1810' }}>{created.join_code}</div>
          </div>

          {shareOption(copied === 'code' ? 'Copied!' : 'Copy Code', () => copy(created.join_code, 'code'))}
          {shareOption(copied === 'link' ? 'Copied!' : 'Copy Link', () => copy(link, 'link'))}
          {shareOption('Share via Text', () => {}, `sms:?&body=${encodeURIComponent(shareText)}`)}
          {shareOption('Share via WhatsApp', () => {}, `https://wa.me/?text=${encodeURIComponent(shareText)}`)}

          <button onClick={() => router.push(`/circles/${created.id}`)} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#B8860B', color: '#fff', border: 'none', borderRadius: 10, padding: '16px', fontSize: 16, fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 700, cursor: 'pointer', marginTop: 14 }}>
            Go to Circle →
          </button>
        </div>
      </div>
    )
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
        gap: '16px'
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            color: '#8B7355'
          }}
        >
          ←
        </button>
        <div>
          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '22px',
            fontWeight: '700',
            color: '#2C1810',
            margin: 0
          }}>Create a Circle</h1>
          <p style={{ fontSize: '13px', color: '#8B7355', margin: '2px 0 0 0' }}>
            Gather people around a shared prayer
          </p>
        </div>
      </div>

      <div style={{ padding: '32px 24px 0 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Intro */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #E8DCC8',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '28px'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#5C4033',
            lineHeight: '1.7',
            margin: 0
          }}>
            A join code will be created for you to share. Anyone with the code can enter it
            at <strong>prayerbands.com/circles</strong> and request to join your circle.
          </p>
        </div>

        {/* Form */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #E8DCC8',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px'
        }}>

          {/* Name field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#8B7355',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              Who or what is this circle for?
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. David's Recovery, The Martinez Family, Our Graduating Seniors"
              maxLength={80}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '15px',
                fontFamily: 'Georgia, serif',
                color: '#2C1810',
                border: '2px solid #E8DCC8',
                borderRadius: '8px',
                backgroundColor: '#FAF6EF',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <p style={{
              fontSize: '12px',
              color: '#B0A090',
              margin: '6px 0 0 0',
              textAlign: 'right'
            }}>
              {name.length}/80
            </p>
          </div>

          {/* Description field */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#8B7355',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              Description <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Share a bit about the need — what you're believing for, how people can pray..."
              maxLength={300}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '15px',
                fontFamily: 'Georgia, serif',
                color: '#2C1810',
                border: '2px solid #E8DCC8',
                borderRadius: '8px',
                backgroundColor: '#FAF6EF',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                lineHeight: '1.6'
              }}
            />
            <p style={{
              fontSize: '12px',
              color: '#B0A090',
              margin: '6px 0 0 0',
              textAlign: 'right'
            }}>
              {description.length}/300
            </p>
          </div>
        </div>

        {needsAccount && (
          <div style={{ backgroundColor: '#FFF8E7', border: '1px solid #F0D080', borderRadius: 12, padding: '18px 20px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 16, fontWeight: 700, color: '#2C1810', marginBottom: 6 }}>Create a free account first</div>
            <div style={{ fontSize: 13, color: '#8B7355', lineHeight: 1.5, marginBottom: 14 }}>
              Prayer Circles are tied to your account so you can lead and return to them. It only takes a moment.
            </div>
            <a href="/signin?redirect=/circles/new" style={{ display: 'inline-block', backgroundColor: '#B8860B', color: '#fff', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 700, textDecoration: 'none' }}>Create Free Account →</a>
            <div style={{ marginTop: 10 }}>
              <a href="/signin?redirect=/circles/new" style={{ fontSize: 12, color: '#8B7355', textDecoration: 'underline' }}>Already have an account? Sign in</a>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#FDF0EE',
            border: '1px solid #E8C4BB',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px'
          }}>
            <p style={{ fontSize: '14px', color: '#C0392B', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          style={{
            width: '100%',
            backgroundColor: name.trim() ? '#B8860B' : '#D4C5B0',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '16px',
            fontSize: '17px',
            fontFamily: 'Playfair Display, Georgia, serif',
            fontWeight: '700',
            cursor: name.trim() && !loading ? 'pointer' : 'default',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Creating Circle...' : 'Create Circle'}
        </button>

        <p style={{
          fontSize: '12px',
          color: '#8B7355',
          textAlign: 'center',
          marginTop: '14px',
          lineHeight: '1.6'
        }}>
          Only registered band holders can create a circle.
          You'll be the leader and will receive a shareable join code.
        </p>

      </div>
    </div>
  )
}