'use client'
import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const C = {
  pageBg: '#F6F1E4',
  card: '#FFFDF8',
  navy: '#0A1628',
  gold: '#C8A96E',
  goldText: '#9A7A35',
  heading: '#15223B',
  body: '#2A3344',
  secondary: '#5C6573',
  borderNavy: 'rgba(10,22,40,0.12)',
  borderSilver: 'rgba(92,101,115,0.20)',
  green: '#4A8A6A',
  greenBg: 'rgba(74,138,106,0.12)',
  red: '#c0392b',
  redBg: 'rgba(192,57,43,0.10)',
}

// TODO(stage 2): swap for a profiles.role check.
const ADMIN_EMAIL = 'dshipps941@gmail.com'

const REASONS = [
  { id: 'seed', label: 'Seeding', hint: 'Getting bands into circulation to start the network' },
  { id: 'donation', label: 'Donation', hint: 'Given to a church, ministry, or cause' },
  { id: 'gift', label: 'Gift', hint: 'Given to a particular person' },
  { id: 'sample', label: 'Sample', hint: 'Sent to show the product' },
  { id: 'damaged', label: 'Damaged', hint: 'Unsellable — written off, not given away' },
] as const

type Scan = {
  band_id: string
  theme: string | null
  color: string | null
  size: string | null
  known: boolean
  available: boolean
  why?: string | null
}

function designLabel(s: Scan): string {
  const d = [s.theme, s.color].filter(Boolean).join(' ') || 'Unknown'
  return s.size ? `${d} · ${s.size}` : d
}

export default function HandoutPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [authorized, setAuthorized] = useState(false)
  const [deniedAs, setDeniedAs] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 'out' = giving bands away; 'in' = putting them back on the shelf.
  const [mode, setMode] = useState<'out' | 'in'>('out')
  const [reason, setReason] = useState<string>('seed')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [uplineEmail, setUplineEmail] = useState('')
  const [note, setNote] = useState('')

  const [scans, setScans] = useState<Scan[]>([])
  const [manual, setManual] = useState('')
  const [nfc, setNfc] = useState<'idle' | 'scanning'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ count: number; pending: boolean; cleared?: { band_id: string; recipient: string }[] } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email === ADMIN_EMAIL) {
        setAuthorized(true)
        // Bands you give out are credited to you unless you say otherwise, so the
        // common case needs no typing and cannot be forgotten.
        setUplineEmail(prev => prev || user.email || '')
      } else { setAuthorized(false); setDeniedAs(user?.email ?? null) }
      setLoading(false)
    })()
  }, [])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  // Availability is judged per direction, so a list built for one mode is
  // meaningless in the other.
  function switchMode(next: 'out' | 'in') {
    if (next === mode) return
    setMode(next)
    setScans([])
    setError('')
    setDone(null)
  }

  async function addBand(raw: string) {
    // Server-side lookup: the browser cannot read every column of `bands`,
    // and a denied column reads back as a missing band.
    const res = await fetch('/api/admin/band-lookup?id=' + encodeURIComponent(raw))
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error || 'Could not look that band up.'); return }

    const m = json.match
    const id = m?.band_id ?? json.candidate
    if (scans.some(s => s.band_id === id)) { setError(id + ' is already on this list'); return }

    // What counts as a valid band depends on which way it is moving.
    //
    // Giving away: it has to be on the shelf (or held back by you).
    // Putting back: it has to be OFF the shelf and never tapped. A band anyone
    // has carried has their stops and prayers on it, and reselling it would post
    // that journey to whoever orders that design next.
    const ok = m && (mode === 'out'
      ? m.status === 'unregistered' && !m.has_org && (!m.has_owner || m.owner_is_you)
      : !m.has_org && !m.has_stops && m.status !== 'registered' && m.status !== 'pending_transfer'
        && !(m.status === 'unregistered' && !m.has_owner))

    const scan: Scan = m
      ? {
          band_id: m.band_id,
          theme: m.theme,
          color: m.color,
          size: m.size,
          known: true,
          available: !!ok,
          why: ok ? null
            : m.has_org ? 'Church stock'
            : m.has_stops ? 'Already carried — has prayers on it'
            : m.status === 'registered' || m.status === 'pending_transfer' ? 'In circulation'
            : mode === 'in' ? 'Already in stock'
            : 'Not on the shelf',
        }
      : { band_id: id, theme: null, color: null, size: null, known: false, available: false, why: 'Unknown band' }

    setScans(prev => [...prev, scan])
    setError('')
    setDone(null)
    if (navigator.vibrate) navigator.vibrate(scan.available ? 40 : [60, 40, 60])
  }

  async function startScan() {
    if (!nfcSupported) return
    try {
      const reader = new (window as any).NDEFReader()
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      await reader.scan({ signal: abortRef.current.signal })
      reader.onreading = (event: any) => {
        for (const rec of event.message.records) {
          try {
            const text = new TextDecoder(rec.encoding || 'utf-8').decode(rec.data)
            if (text.includes('/r/') || text.includes('/band/')) { addBand(text); return }
          } catch {}
        }
        setError('That tag did not carry a band id.')
      }
      setNfc('scanning')
      setError('')
    } catch (e: any) {
      setError(e?.message || 'Could not start the NFC reader.')
    }
  }

  function stopScan() {
    abortRef.current?.abort()
    abortRef.current = null
    setNfc('idle')
  }

  const blocked = scans.filter(s => !s.available)

  async function submit() {
    if (scans.length === 0) return
    setBusy(true)
    setError('')
    try {
      const res = mode === 'out'
        ? await fetch('/api/admin/hand-out-bands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bandIds: scans.map(s => s.band_id),
              reason, recipientName, recipientEmail, uplineEmail, note,
            }),
          })
        : await fetch('/api/admin/return-bands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bandIds: scans.map(s => s.band_id), note }),
          })
      const json = await res.json()
      if (res.ok) {
        setDone({
          count: json.count,
          pending: !!json.upline_pending,
          // Returning a band wipes any dedication on it — it can be picked for
          // any order once it is back on the shelf. Never silently.
          cleared: json.clearedDedications ?? [],
        })
        setScans([])
        setRecipientName('')
        setRecipientEmail('')
        setNote('')
      } else {
        setError(json.error || 'Could not record these bands.')
      }
    } catch {
      setError('Network error — nothing was recorded.')
    } finally { setBusy(false) }
  }

  const btn = (bg: string, fg: string) => ({
    background: bg, color: fg, border: 'none', borderRadius: 10, padding: '14px 22px',
    fontSize: 13, fontWeight: 700, fontFamily: 'Cinzel, serif', letterSpacing: '0.06em',
    textTransform: 'uppercase' as const, cursor: 'pointer', minHeight: 48,
  })
  const panel = { background: C.card, border: '1px solid ' + C.borderNavy, borderRadius: 12, overflow: 'hidden' as const }
  const panelHead = { padding: '13px 16px', borderBottom: '1px solid ' + C.borderSilver, fontWeight: 700, fontSize: 15, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }
  const field = { width: '100%', padding: '12px 13px', fontSize: 16, border: '1px solid ' + C.borderSilver, borderRadius: 9, background: '#fff', color: C.heading, boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif' }
  const fieldLabel = { fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.secondary, marginBottom: 6, display: 'block' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'grid', placeItems: 'center', color: C.secondary, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
      Loading…
    </div>
  )

  if (!authorized) return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 24, fontWeight: 700, color: C.heading, marginBottom: 10 }}>
          {deniedAs ? 'Signed in as the wrong account' : 'Sign in to record handouts'}
        </div>
        <p style={{ color: C.secondary, fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
          {deniedAs
            ? <>This browser is signed in as <strong style={{ color: C.heading }}>{deniedAs}</strong>. This needs <strong style={{ color: C.heading }}>{ADMIN_EMAIL}</strong>.</>
            : <>Sign in as <strong style={{ color: C.heading }}>{ADMIN_EMAIL}</strong> to continue.</>}
        </p>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/signin/personal?redirect=/fulfill/handout' }} style={btn(C.gold, C.navy)}>
          {deniedAs ? 'Switch account' : 'Sign in'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, fontFamily: 'Inter, sans-serif', color: C.body }}>
      <div style={{ background: C.navy, color: C.pageBg, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: '0.14em', color: C.gold, textTransform: 'uppercase' }}>
            {mode === 'out' ? 'Give Away' : 'Return'}
          </div>
          <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20 }}>
            {mode === 'out' ? 'Take bands out of stock' : 'Put bands back into stock'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/fulfill" style={{ color: C.gold, fontSize: 12, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>← Packing</a>
          <a href="/admin" style={{ color: C.gold, fontSize: 12, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>Admin</a>
        </div>
      </div>

      {/* Which way are the bands moving? Both directions scan the same way and
          write the same ledger, so they belong on one screen rather than two
          nearly-identical ones. */}
      <div style={{ padding: '16px 20px 0', display: 'flex', gap: 10 }}>
        {([
          { id: 'out' as const, label: 'Take out of stock', hint: 'Giving bands away' },
          { id: 'in' as const, label: 'Put back into stock', hint: 'Bands that came back' },
        ]).map(m => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id)}
            style={{
              flex: 1, textAlign: 'left', padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
              background: mode === m.id ? C.navy : C.card,
              color: mode === m.id ? C.pageBg : C.body,
              border: '1px solid ' + (mode === m.id ? C.navy : C.borderNavy),
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>{m.label}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{m.hint}</div>
          </button>
        ))}
      </div>

      <div className="pb-handout-grid" style={{ padding: 20, display: 'grid', gap: 20, alignItems: 'start' }}>
        <div style={panel}>
          <div style={panelHead}>{mode === 'out' ? 'Why are these leaving stock?' : 'Putting bands back'}</div>
          <div style={{ padding: 20 }}>
            {mode === 'in' && (
              <div style={{ fontSize: 13, color: C.secondary, lineHeight: 1.65, marginBottom: 16 }}>
                Scan bands that never made it out &mdash; a giveaway that did not happen, a sample that came back,
                anything marked out by mistake. They go back on the sellable shelf.
                <br /><br />
                A band anyone has already tapped is refused: its prayers belong to whoever carried it, and reselling
                it would send their journey to the next customer. <strong style={{ color: C.body }}>Any dedication is
                cleared</strong>, since a band on the shelf can be picked for any order.
              </div>
            )}
            <div style={{ display: 'grid', gap: 8, marginBottom: 20, ...(mode === 'in' ? { display: 'none' } : {}) }}>
              {REASONS.map(r => (
                <label
                  key={r.id}
                  style={{
                    display: 'flex', gap: 11, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 9,
                    cursor: 'pointer',
                    background: reason === r.id ? C.greenBg : 'rgba(10,22,40,0.03)',
                    border: '1px solid ' + (reason === r.id ? C.green : 'transparent'),
                  }}
                >
                  <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)}
                    style={{ width: 18, height: 18, marginTop: 1, accentColor: C.green, flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', color: C.heading, fontWeight: 600, fontSize: 14.5 }}>{r.label}</span>
                    <span style={{ display: 'block', color: C.secondary, fontSize: 12.5, marginTop: 2, lineHeight: 1.5 }}>{r.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {mode === 'out' && reason !== 'damaged' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={fieldLabel}>Given to (optional)</label>
                  <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Name, church, or event" style={field} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={fieldLabel}>Their email (optional)</label>
                  <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="name@example.com" inputMode="email" autoCapitalize="off" style={field} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={fieldLabel}>Credit the giver</label>
                  <input value={uplineEmail} onChange={e => setUplineEmail(e.target.value)} placeholder="giver@example.com" inputMode="email" autoCapitalize="off" style={field} />
                  <p style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.6, marginTop: 7 }}>
                    Whoever these bands are credited to sits above every person who ends up claiming one. They do not
                    need an account yet — if they sign up later, the credit attaches itself then.
                  </p>
                </div>
              </>
            )}

            <div>
              <label style={fieldLabel}>Note (optional)</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Youth night, 8 Aug" style={field} />
            </div>
          </div>
        </div>

        <div style={panel}>
          <div style={panelHead}>Bands</div>
          <div style={{ padding: 20 }}>
            {done ? (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20, color: C.green, marginBottom: 8 }}>
                  {done.count} band{done.count === 1 ? '' : 's'} {mode === 'out' ? 'out of stock' : 'back in stock'} ✓
                </div>
                <p style={{ fontSize: 13.5, color: C.secondary, lineHeight: 1.6 }}>
                  {done.pending
                    ? 'The giver has no account yet, so the credit is being held against their email. It attaches the moment they sign up.'
                    : 'Recorded. Scan the next batch below.'}
                </p>
                {done.cleared && done.cleared.length > 0 && (
                  <div style={{ marginTop: 12, padding: '11px 13px', background: C.redBg, border: '1px solid ' + C.borderSilver, borderRadius: 9 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 5 }}>Dedication cleared</div>
                    <div style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.6 }}>
                      {done.cleared.map(c => <div key={c.band_id}><strong style={{ color: C.body }}>{c.band_id}</strong> &mdash; was for {c.recipient}</div>)}
                      <div style={{ marginTop: 5 }}>Write it again from Admin &rarr; Dedications if that was not intended.</div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {nfcSupported ? (
              <div style={{ marginBottom: 12 }}>
                {nfc === 'scanning' ? (
                  <button onClick={stopScan} style={{ ...btn(C.navy, C.pageBg), width: '100%' }}>◉ Tap bands… (stop)</button>
                ) : (
                  <button onClick={startScan} style={{ ...btn(C.gold, C.navy), width: '100%' }}>Start tapping bands</button>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.6, marginBottom: 12, background: 'rgba(10,22,40,0.04)', padding: '10px 12px', borderRadius: 8 }}>
                This device can&apos;t read NFC from a browser — Chrome on Android is the only one that can. Type or paste band ids below instead.
              </p>
            )}

            <form onSubmit={e => { e.preventDefault(); const v = manual; setManual(''); if (v.trim()) addBand(v) }} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={manual} onChange={e => setManual(e.target.value)} placeholder="PB-XXXXX or just XXXXX" autoCapitalize="characters" autoCorrect="off"
                style={{ ...field, flex: 1, fontFamily: 'ui-monospace, monospace', minWidth: 0 }} />
              <button type="submit" style={btn('rgba(10,22,40,0.06)', C.heading)}>Add</button>
            </form>

            {error && (
              <div style={{ fontSize: 13, color: C.red, background: C.redBg, padding: '10px 12px', borderRadius: 8, marginBottom: 14, lineHeight: 1.6 }}>{error}</div>
            )}

            {scans.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.secondary, marginBottom: 8 }}>
                  Going out ({scans.length})
                </div>
                {scans.map(s => (
                  <div key={s.band_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 6, background: s.available ? C.greenBg : C.redBg }}>
                    <span style={{ color: s.available ? C.green : C.red, fontSize: 15 }}>{s.available ? '✓' : '✕'}</span>
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13.5, color: C.heading }}>{s.band_id}</span>
                    <span style={{ fontSize: 12.5, color: C.secondary, flex: 1 }}>
                      {!s.known ? 'not a known band' : !s.available ? 'not in stock' : designLabel(s)}
                    </span>
                    <button onClick={() => setScans(prev => prev.filter(x => x.band_id !== s.band_id))} aria-label={'Remove ' + s.band_id}
                      style={{ background: 'none', border: 'none', color: C.secondary, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {blocked.length > 0 && (
              <div style={{ fontSize: 12.5, color: C.body, background: C.redBg, padding: '10px 12px', borderRadius: 8, marginBottom: 14, lineHeight: 1.6 }}>
                {/* Says which band and why, rather than one count for a mixed
                    list — "not in stock" is the wrong words entirely when the
                    reason is that somebody has already prayed on it. */}
                {blocked.length} band{blocked.length === 1 ? '' : 's'} will be refused:
                <div style={{ marginTop: 5 }}>
                  {blocked.map(b => (
                    <div key={b.band_id}><strong>{b.band_id}</strong> &mdash; {b.why || 'not eligible'}</div>
                  ))}
                </div>
                <div style={{ marginTop: 5 }}>Remove {blocked.length === 1 ? 'it' : 'them'} to continue.</div>
              </div>
            )}

            <button
              onClick={submit}
              disabled={busy || scans.length === 0 || blocked.length > 0}
              style={{
                ...btn(scans.length && !blocked.length ? C.green : 'rgba(10,22,40,0.10)', scans.length && !blocked.length ? '#fff' : C.secondary),
                width: '100%',
                opacity: busy || !scans.length || blocked.length ? 0.6 : 1,
              }}
            >
              {busy
                ? 'Recording…'
                : scans.length
                  ? `${mode === 'out' ? 'Take' : 'Put'} ${scans.length} band${scans.length === 1 ? '' : 's'} ${mode === 'out' ? 'out of' : 'back into'} stock`
                  : 'Scan bands to begin'}
            </button>

            <p style={{ fontSize: 12, color: C.secondary, lineHeight: 1.6, marginTop: 14, background: 'rgba(10,22,40,0.04)', padding: '10px 12px', borderRadius: 8 }}>
              These bands still work exactly as normal — whoever taps one registers it and joins the chain. This only
              stops them being counted as stock you can still sell.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .pb-handout-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  )
}
