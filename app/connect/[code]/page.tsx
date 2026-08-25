'use client'

import { useState, useEffect, use } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Logo from '@/components/Logo'

const GOLD = '#C8A96E'
const INK = '#0A1628'
const CREAM = '#F6F1E4'
const DARK = '#2C1810'
const GRAY = '#8B7355'
const serif = "'Playfair Display', Georgia, serif"
const body = "'Inter', system-ui, sans-serif"

export default function ConnectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [working, setWorking] = useState(false)
  const [result, setResult] = useState<'sent' | 'already' | 'self' | 'not_holder' | 'error' | null>(null)

  useEffect(() => {
    fetch(`/api/connect/info?code=${encodeURIComponent(code)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setName(d.name))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [code])

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.auth.getUser().then(({ data }) => { setUserId(data?.user?.id ?? null); setAuthReady(true) })
  }, [])

  async function connect() {
    setWorking(true)
    try {
      const res = await fetch('/api/network/connect-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connect_code: code }),
      })
      if (res.ok) { setResult('sent'); return }
      if (res.status === 409) { setResult('already'); return }
      if (res.status === 403) { setResult('not_holder'); return }
      const d = await res.json().catch(() => ({}))
      setResult(d.error === "You can't connect with yourself" ? 'self' : 'error')
    } finally {
      setWorking(false)
    }
  }

  const card: React.CSSProperties = { background: 'white', borderRadius: 16, padding: '28px 24px', border: `1px solid rgba(44,24,16,0.1)`, textAlign: 'center', maxWidth: 380, width: '100%', boxShadow: '0 8px 30px rgba(10,22,40,0.08)' }
  const gold: React.CSSProperties = { display: 'inline-block', background: GOLD, color: INK, padding: '13px 30px', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, textDecoration: 'none', border: 'none', cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: body, color: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 22 }}><Logo size={40} withName nameColor={DARK} nameSize={20} /></div>

      {loading ? (
        <div style={{ color: GRAY, fontSize: 15 }}>Loading…</div>
      ) : notFound ? (
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🙏</div>
          <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Code not found</div>
          <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6 }}>This connect link isn&rsquo;t valid. Ask for a fresh code or QR.</div>
        </div>
      ) : result === 'sent' ? (
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✝</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Request sent to {name}</div>
          <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 20 }}>They&rsquo;ll see your request and can accept it to become prayer partners.</div>
          <a href="/my-band" style={gold}>Go to my band ✝</a>
        </div>
      ) : result === 'already' ? (
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🙏</div>
          <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>You&rsquo;re already connected</div>
          <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 20 }}>You and {name} are already prayer partners (or a request is pending).</div>
          <a href="/my-band" style={gold}>Go to my band</a>
        </div>
      ) : result === 'self' ? (
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🙂</div>
          <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>That&rsquo;s your own code</div>
          <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 20 }}>Share it with others so they can connect with you.</div>
          <a href="/my-band" style={gold}>Go to my band</a>
        </div>
      ) : result === 'not_holder' ? (
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🙏</div>
          <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Register a band first</div>
          <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 20 }}>Connecting in prayer is for band holders. Register a band, then connect with {name}.</div>
          <a href="/my-band" style={gold}>Go to my account</a>
        </div>
      ) : result === 'error' ? (
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🙏</div>
          <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 20 }}>Please try again in a moment.</div>
          <button onClick={() => setResult(null)} style={gold}>Try again</button>
        </div>
      ) : (
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🙏</div>
          <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 10 }}>Connect in prayer</div>
          <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, marginBottom: 10, lineHeight: 1.25 }}>Connect with {name}</div>
          {!authReady ? (
            <div style={{ color: GRAY, fontSize: 14 }}>…</div>
          ) : userId ? (
            <>
              <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 22 }}>Become prayer partners so you can lift each other up.</div>
              <button onClick={connect} disabled={working} style={{ ...gold, opacity: working ? 0.6 : 1 }}>{working ? 'Sending…' : 'Add to Prayer Partners ✝'}</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, marginBottom: 22 }}>Sign in to connect with {name} in prayer.</div>
              <a href={`/signin?redirect=${encodeURIComponent(`/connect/${code}`)}`} style={gold}>Sign in ✝</a>
            </>
          )}
        </div>
      )}
    </div>
  )
}
