'use client'

import { useState, useEffect } from 'react'

interface Connection {
  connection_id: string
  user_id: string
  name: string
  band_id: string | null
  since: string
}

interface PendingRequest {
  connection_id: string
  requester_id: string
  name: string
  band_id: string | null
  created_at: string
}

export default function NetworkSection({ userId }: { userId: string }) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/network/my-network')
    if (res.ok) {
      const data = await res.json()
      setConnections(data.connections ?? [])
      setPending(data.pending ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function respond(connectionId: string, action: 'accept' | 'decline') {
    setBusy(connectionId)
    try {
      const res = await fetch('/api/network/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId, action }),
      })
      if (res.ok) {
        // Remove from pending; reload to surface a newly-accepted connection.
        setPending(prev => prev.filter(p => p.connection_id !== connectionId))
        if (action === 'accept') load()
      }
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px 0', color: '#8B7355', fontSize: 14, textAlign: 'center' }}>
        Loading your network...
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 17, fontWeight: 700, color: '#2C1810', margin: '0 0 14px 0' }}>
        Prayer Network
      </h3>

      {/* Pending incoming requests */}
      {pending.map(p => (
        <div key={p.connection_id} style={{ backgroundColor: '#FFF8E7', border: '1px solid #F0D080', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
          <p style={{ fontSize: 14, color: '#2C1810', margin: '0 0 10px 0' }}>
            <strong>{p.name}</strong> wants to connect with you in prayer.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => respond(p.connection_id, 'accept')}
              disabled={busy === p.connection_id}
              style={{ flex: 1, backgroundColor: '#B8860B', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 600, cursor: 'pointer' }}
            >
              {busy === p.connection_id ? '...' : 'Accept'}
            </button>
            <button
              onClick={() => respond(p.connection_id, 'decline')}
              disabled={busy === p.connection_id}
              style={{ flex: 1, backgroundColor: 'transparent', color: '#8B7355', border: '1px solid #D4C5B0', borderRadius: 8, padding: '9px', fontSize: 13, fontFamily: 'Georgia, serif', cursor: 'pointer' }}
            >
              Decline
            </button>
          </div>
        </div>
      ))}

      {/* Accepted connections */}
      {connections.map(c => (
        <div key={c.connection_id} style={{ backgroundColor: '#fff', border: '1px solid #E8DCC8', borderRadius: 10, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#E8DCC8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
            🙏
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 15, fontWeight: 700, color: '#2C1810', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.name}
            </p>
            <p style={{ fontSize: 12, color: '#8B7355', margin: '2px 0 0 0' }}>In your prayer network</p>
          </div>
        </div>
      ))}

      {/* Empty state */}
      {connections.length === 0 && pending.length === 0 && (
        <div style={{ backgroundColor: '#fff', border: '1px dashed #D4C5B0', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: 24, margin: '0 0 8px 0' }}>🙏</p>
          <p style={{ fontSize: 14, color: '#8B7355', margin: 0, lineHeight: 1.5 }}>
            No connections yet. Tap someone&rsquo;s prayer band to connect with them, or share yours.
          </p>
        </div>
      )}
    </div>
  )
}
