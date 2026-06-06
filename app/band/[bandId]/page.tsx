'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

// ── Types ─────────────────────────────────────────────────
type Registration = {
  id: string
  name: string
  city: string
  country: string
  created_at: string
  prayer: string
  user_id: string | null
}

type BandStatus = {
  screen: 'personal_space' | 'incoming_transfer' | 'first_tap_gift' | 'journey' | 'first_tap_blank' | 'not_found' | 'loading'
  reason?: string
  band?: any
  registrations?: Registration[]
  currentHolder?: Registration
  transfer?: any
  senderName?: string
  dedicatorName?: string
}

// ── Helpers ───────────────────────────────────────────────
const GOLD   = '#B8860B'
const GREEN  = '#1a4a3a'
const NAVY   = '#1a2a4a'
const DARK   = '#2C1810'
const CREAM  = '#FAF6EF'
const GRAY   = '#7A6A5A'

const serif = "'Playfair Display', Georgia, serif"
const body  = "'Lora', Georgia, serif"

function Avatar({ letter, color, size = 44 }: { letter: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: serif, fontSize: size * 0.4, fontWeight: 700, color: 'white',
      flexShrink: 0,
    }}>{letter}</div>
  )
}

const AVATAR_COLORS = [GOLD, GREEN, NAVY, '#5B4FCF', '#C0392B', '#2E7D6B', '#8B4513']
function avatarColor(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

// ── Main Component ────────────────────────────────────────
export default function BandPage() {
  const params = useParams()
  const router = useRouter()
  const bandId = (params?.bandId as string)?.toUpperCase()

  const [status, setStatus] = useState<BandStatus>({ screen: 'loading' })
  const [userId, setUserId] = useState<string | null>(null)

  // ── Forms ─────────────────────────────────────────────
  const [claimName, setClaimName] = useState('')
  const [claimPrayer, setClaimPrayer] = useState('')
  const [claimStep, setClaimStep] = useState<'prompt' | 'form' | 'done'>('prompt')

  const [transferNote, setTransferNote] = useState('')
  const [transferStep, setTransferStep] = useState<'idle' | 'sheet' | 'pending'>('idle')

  const [submitting, setSubmitting] = useState(false)
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null)

  // ── Auth check ────────────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null)
    })
  }, [])

  // ── Fetch band status ─────────────────────────────────
  useEffect(() => {
    if (!bandId) return
    const url = `/api/band-status?id=${bandId}${userId ? `&userId=${userId}` : ''}`
    fetch(url)
      .then(r => r.json())
      .then(data => setStatus(data))
      .catch(() => setStatus({ screen: 'not_found' }))
  }, [bandId, userId])

  // ── Register / Claim band ─────────────────────────────
  async function handleClaim() {
    if (!claimName.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/register-band', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId,
          name: claimName,
          prayer: claimPrayer,
          userId: userId ?? null,
        }),
      })
      setClaimStep('done')
      // Refresh status after a moment
      setTimeout(() => {
        fetch(`/api/band-status?id=${bandId}${userId ? `&userId=${userId}` : ''}`)
          .then(r => r.json())
          .then(data => setStatus(data))
      }, 1500)
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Initiate transfer ─────────────────────────────────
  async function handleInitiateTransfer() {
    setSubmitting(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      // Insert transfer record
      await supabase.from('band_transfers').insert({
        band_id: bandId,
        from_user_id: userId,
        note: transferNote,
        status: 'pending',
      })
      // Update band status
      await supabase
        .from('bands')
        .update({ status: 'pending_transfer' })
        .eq('band_id', bandId)

      setTransferStep('pending')
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Cancel transfer ───────────────────────────────────
  async function handleCancelTransfer() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase
      .from('band_transfers')
      .update({ status: 'cancelled' })
      .eq('band_id', bandId)
      .eq('status', 'pending')

    await supabase
      .from('bands')
      .update({ status: 'registered' })
      .eq('band_id', bandId)

    setTransferStep('idle')
  }

  // ── Accept transfer ───────────────────────────────────
  async function handleAcceptTransfer() {
    if (!claimName.trim()) return
    setSubmitting(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      // Register new holder
      await fetch('/api/register-band', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId,
          name: claimName,
          prayer: claimPrayer,
          userId: userId ?? null,
        }),
      })
      // Complete the transfer
      await supabase
        .from('band_transfers')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('band_id', bandId)
        .eq('status', 'pending')

      await supabase
        .from('bands')
        .update({ status: 'registered' })
        .eq('band_id', bandId)

      setClaimStep('done')
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Shared UI pieces ──────────────────────────────────
  function Nav() {
    return (
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid rgba(44,24,16,0.1)',
        background: 'rgba(250,246,239,0.97)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: DARK }}>
          ✝ Prayer<span style={{ color: GOLD }}>Bands</span>
        </span>
        <span style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic' }}>
          {bandId}
        </span>
      </nav>
    )
  }

  function StatsStrip({ regs }: { regs: Registration[] }) {
    const countries = new Set(regs.map(r => r.country).filter(Boolean)).size
    const prayers = regs.filter(r => r.prayer).length
    return (
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid rgba(44,24,16,0.08)' }}>
        {[
          { num: regs.length, lbl: 'People' },
          { num: countries || '—', lbl: 'Countries' },
          { num: prayers, lbl: 'Prayers' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '12px 8px', textAlign: 'center',
            borderRight: i < 2 ? '1px solid rgba(44,24,16,0.08)' : 'none',
          }}>
            <span style={{ display: 'block', fontFamily: serif, fontSize: 20, fontWeight: 700, color: GOLD }}>{s.num}</span>
            <span style={{ display: 'block', fontFamily: body, fontSize: 10, color: GRAY, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>{s.lbl}</span>
          </div>
        ))}
      </div>
    )
  }

  function PrayerChain({ regs }: { regs: Registration[] }) {
    return (
      <div style={{ padding: '24px 20px' }}>
        <div style={{
          fontFamily: serif, fontSize: 18, fontWeight: 700, color: DARK,
          marginBottom: 20, paddingBottom: 10,
          borderBottom: '1px solid rgba(44,24,16,0.08)',
        }}>Prayer Chain</div>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 22, top: 8, bottom: 8,
            width: 1, background: 'rgba(44,24,16,0.1)',
          }} />
          {regs.map((reg, i) => (
            <div key={reg.id} style={{ display: 'flex', gap: 16, marginBottom: 24, position: 'relative' }}>
              <Avatar letter={reg.name?.[0]?.toUpperCase() ?? '?'} color={avatarColor(i)} />
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                  <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK }}>
                    {reg.name}
                    {i === 0 && (
                      <span style={{
                        display: 'inline-block', fontSize: 10, fontFamily: body,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 20, marginLeft: 6,
                        background: 'rgba(184,134,11,0.12)', color: GOLD,
                      }}>Origin</span>
                    )}
                    {i === regs.length - 1 && i > 0 && (
                      <span style={{
                        display: 'inline-block', fontSize: 10, fontFamily: body,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 20, marginLeft: 6,
                        background: 'rgba(44,24,16,0.08)', color: GRAY,
                      }}>Current</span>
                    )}
                  </span>
                  <span style={{ fontFamily: body, fontSize: 11, color: '#9A8A7A' }}>
                    {new Date(reg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {(reg.city || reg.country) && (
                  <div style={{ fontFamily: body, fontSize: 12, color: GRAY, marginBottom: 6 }}>
                    📍 {[reg.city, reg.country].filter(Boolean).join(', ')}
                  </div>
                )}
                {reg.prayer && (
                  <>
                    <div style={{
                      fontFamily: body, fontSize: 13, color: '#3C2C1C',
                      lineHeight: 1.6, fontStyle: 'italic',
                      ...(expandedPrayer !== reg.id ? {
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      } : {}),
                    }}>"{reg.prayer}"</div>
                    <button
                      onClick={() => setExpandedPrayer(expandedPrayer === reg.id ? null : reg.id)}
                      style={{
                        background: 'none', border: 'none', color: GOLD,
                        fontFamily: body, fontSize: 12, cursor: 'pointer', padding: '4px 0',
                      }}
                    >
                      {expandedPrayer === reg.id ? 'Show less' : 'Read full prayer'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function ClaimForm({ onSubmit, onBack, title, subtitle, submitLabel }: {
    onSubmit: () => void
    onBack?: () => void
    title: string
    subtitle: string
    submitLabel: string
  }) {
    return (
      <div style={{
        margin: '16px 20px', background: 'white', borderRadius: 16,
        padding: '24px', border: '1px solid rgba(44,24,16,0.1)',
        boxShadow: '0 4px 20px rgba(44,24,16,0.06)',
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: GRAY,
            fontFamily: body, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16,
          }}>← Back</button>
        )}
        <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 20 }}>{subtitle}</div>
        <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your name</label>
        <input
          value={claimName}
          onChange={e => setClaimName(e.target.value)}
          placeholder="First name or full name"
          style={{
            display: 'block', width: '100%', padding: '12px 14px',
            border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8,
            fontFamily: body, fontSize: 15, color: DARK, background: CREAM,
            marginBottom: 16, outline: 'none', boxSizing: 'border-box',
          }}
        />
        <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your prayer (optional)</label>
        <textarea
          value={claimPrayer}
          onChange={e => setClaimPrayer(e.target.value)}
          placeholder="A prayer, a verse, or what this moment means to you..."
          rows={4}
          style={{
            display: 'block', width: '100%', padding: '12px 14px',
            border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8,
            fontFamily: body, fontSize: 14, color: DARK, background: CREAM,
            marginBottom: 20, outline: 'none', resize: 'vertical', lineHeight: 1.5,
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={onSubmit}
          disabled={submitting || !claimName.trim()}
          style={{
            display: 'block', width: '100%', padding: 15,
            background: claimName.trim() ? GOLD : '#ccc',
            color: '#0f0d09', border: 'none', borderRadius: 10,
            fontFamily: serif, fontSize: 16, fontWeight: 700,
            cursor: claimName.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    )
  }

  function SuccessCard({ title, subtitle }: { title: string; subtitle: string }) {
    return (
      <div style={{
        margin: '24px 20px',
        background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`,
        borderRadius: 16, padding: '32px 24px', textAlign: 'center', color: 'white',
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🙏</div>
        <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.6 }}>{subtitle}</div>
      </div>
    )
  }

  // ── LOADING ───────────────────────────────────────────
  if (status.screen === 'loading') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: body, color: GRAY, fontStyle: 'italic' }}>Loading band journey...</div>
      </div>
    )
  }

  // ── NOT FOUND ─────────────────────────────────────────
  if (status.screen === 'not_found') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh' }}>
        <Nav />
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✝</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Band not found</div>
          <div style={{ fontFamily: body, fontSize: 14, color: GRAY }}>Check the ID on your wristband and try again.</div>
        </div>
      </div>
    )
  }

  const regs = status.registrations ?? []

  // ── PERSONAL SPACE (holder or pre-linked owner) ───────
  if (status.screen === 'personal_space') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />
        <StatsStrip regs={regs} />

        {/* Header */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700 }}>Your Band</div>
              <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginTop: 2 }}>
                {regs.length === 0 ? 'Just arrived' : `Held by you`}
              </div>
            </div>
            {/* Transfer button */}
            {transferStep === 'idle' && (
              <button
                onClick={() => setTransferStep('sheet')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10,
                  padding: '10px 18px', fontFamily: serif, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                ↗ Pass On
              </button>
            )}
          </div>
        </div>

        {/* Today's verse placeholder */}
        <div style={{
          margin: '20px 20px 0',
          background: `linear-gradient(135deg, ${NAVY}, #2c4a8a)`,
          borderRadius: 14, padding: '20px',
          color: 'white', textAlign: 'center',
        }}>
          <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 10 }}>Today's Verse</div>
          <div style={{ fontFamily: serif, fontSize: 17, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 8 }}>
            "Pray without ceasing."
          </div>
          <div style={{ fontFamily: body, fontSize: 12, opacity: 0.6 }}>1 Thessalonians 5:17</div>
        </div>

        {/* Prayer requests placeholder */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{
            fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 12,
            paddingBottom: 8, borderBottom: '1px solid rgba(44,24,16,0.08)',
          }}>Prayer Requests</div>
          <div style={{
            background: 'white', borderRadius: 10, padding: '14px 16px',
            border: '1px dashed rgba(44,24,16,0.15)', textAlign: 'center',
            fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic',
          }}>
            Prayer requests coming soon ✝
          </div>
        </div>

        {/* Transfer sheet */}
        {transferStep === 'sheet' && (
          <div
            onClick={() => setTransferStep('idle')}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.4)',
              zIndex: 150, display: 'flex', alignItems: 'flex-end',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: CREAM, borderRadius: '20px 20px 0 0',
                padding: '28px 24px 48px', width: '100%', boxSizing: 'border-box',
              }}
            >
              <div style={{ width: 36, height: 4, background: 'rgba(44,24,16,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Pass This Band On</div>
              <div style={{ fontFamily: body, fontSize: 14, color: GRAY, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>
                Write a prayer or note for the person you're giving this to.
              </div>
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your prayer for them (optional)</label>
              <textarea
                value={transferNote}
                onChange={e => setTransferNote(e.target.value)}
                placeholder="e.g. I'm giving you this band because I've been praying for you..."
                rows={3}
                style={{
                  display: 'block', width: '100%', padding: '12px 14px',
                  border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8,
                  fontFamily: body, fontSize: 14, color: DARK, background: 'white',
                  resize: 'none', marginBottom: 16, outline: 'none', lineHeight: 1.5,
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleInitiateTransfer}
                disabled={submitting}
                style={{
                  display: 'block', width: '100%', padding: 15,
                  background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10,
                  fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10,
                }}
              >
                {submitting ? 'Setting up...' : 'Ready to hand it off →'}
              </button>
              <button
                onClick={() => setTransferStep('idle')}
                style={{
                  display: 'block', width: '100%', padding: 12,
                  background: 'transparent', color: GRAY,
                  border: '1px solid rgba(44,24,16,0.15)', borderRadius: 10,
                  fontFamily: body, fontSize: 14, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        )}

        {/* Pending transfer state */}
        {transferStep === 'pending' && (
          <div style={{
            margin: '20px 20px 0',
            background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`,
            borderRadius: 16, padding: '28px 24px', color: 'white', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✝</div>
            <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Waiting for them to tap</div>
            <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 20 }}>
              Hand the band to the other person and ask them to tap it with their phone.
            </div>
            <button
              onClick={handleCancelTransfer}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '10px 20px',
                fontFamily: body, fontSize: 13, cursor: 'pointer',
              }}
            >Cancel transfer</button>
          </div>
        )}

        <PrayerChain regs={regs} />
        <div style={{ height: 40 }} />
      </div>
    )
  }

  // ── INCOMING TRANSFER ─────────────────────────────────
  if (status.screen === 'incoming_transfer') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />
        <StatsStrip regs={regs} />

        {claimStep === 'prompt' && (
          <div style={{
            margin: '24px 20px',
            background: `linear-gradient(160deg, ${NAVY}, #2c4a8a)`,
            borderRadius: 16, padding: '28px 24px', color: 'white', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✝</div>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
              {status.senderName ? `${status.senderName} is passing this band to you` : 'Someone is passing this band to you'}
            </div>
            <div style={{ fontFamily: body, fontSize: 14, opacity: 0.8, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>
              This band has traveled through {regs.length} {regs.length === 1 ? 'person' : 'people'}. Now it's being offered to you.
            </div>
            {status.transfer?.note && (
              <div style={{
                background: 'rgba(255,255,255,0.1)', borderRadius: 12,
                padding: '14px 16px', fontFamily: body, fontSize: 14,
                fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20, textAlign: 'left',
              }}>
                "{status.transfer.note}"
              </div>
            )}
            <button
              onClick={() => setClaimStep('form')}
              style={{
                display: 'block', width: '100%', padding: 16,
                background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10,
                fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10,
              }}
            >Accept this band →</button>
            <button
              onClick={() => setClaimStep('form')}
              style={{
                display: 'block', width: '100%', padding: 12,
                background: 'transparent', color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10,
                fontFamily: body, fontSize: 14, cursor: 'pointer',
              }}
            >Just view the journey</button>
          </div>
        )}

        {claimStep === 'form' && (
          <ClaimForm
            title="You're joining the chain ✝"
            subtitle="Add your name and a prayer to complete the handoff."
            submitLabel="Accept & add my prayer ✝"
            onSubmit={handleAcceptTransfer}
            onBack={() => setClaimStep('prompt')}
          />
        )}

        {claimStep === 'done' && (
          <SuccessCard
            title="The band is yours now"
            subtitle="You've been added to the prayer chain. Every time you tap this band, you'll see the full journey — and when you're ready, you can pass it on too."
          />
        )}

        <PrayerChain regs={regs} />
        <div style={{ height: 40 }} />
      </div>
    )
  }

  // ── FIRST TAP — GIFT ──────────────────────────────────
  if (status.screen === 'first_tap_gift') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />

        {claimStep === 'prompt' && (
          <div style={{
            margin: '24px 20px',
            background: `linear-gradient(135deg, #1a4a3a, #2E7D6B)`,
            borderRadius: 16, padding: '28px 24px', color: 'white', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✝</div>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
              {status.dedicatorName ? `${status.dedicatorName} is praying for you` : 'Someone is praying for you'}
            </div>
            <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>
              This band was sent to you as an act of prayer. You are not forgotten.
            </div>
            {status.band?.dedication_note && (
              <div style={{
                background: 'rgba(255,255,255,0.12)', borderRadius: 12,
                padding: '14px 16px', fontFamily: body, fontSize: 14,
                fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20, textAlign: 'left',
              }}>
                "{status.band.dedication_note}"
              </div>
            )}
            <button
              onClick={() => setClaimStep('form')}
              style={{
                display: 'block', width: '100%', padding: 16,
                background: GOLD, color: '#0f0d09', border: 'none', borderRadius: 10,
                fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10,
              }}
            >This band is mine now →</button>
            <button
              onClick={() => setClaimStep('form')}
              style={{
                display: 'block', width: '100%', padding: 12,
                background: 'transparent', color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10,
                fontFamily: body, fontSize: 14, cursor: 'pointer',
              }}
            >Just add a prayer</button>
          </div>
        )}

        {claimStep === 'form' && (
          <ClaimForm
            title="Join the Journey"
            subtitle="Your prayer becomes part of this band's story forever."
            submitLabel="Add my prayer to this band ✝"
            onSubmit={handleClaim}
            onBack={() => setClaimStep('prompt')}
          />
        )}

        {claimStep === 'done' && (
          <SuccessCard
            title="You're part of this story"
            subtitle="Your prayer has been woven into this band's journey. When you pass it on, they'll see every prayer that came before — including yours."
          />
        )}

        <div style={{ height: 40 }} />
      </div>
    )
  }

  // ── JOURNEY (visitor or new potential holder) ─────────
  if (status.screen === 'journey') {
    return (
      <div style={{ background: CREAM, minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />
        <StatsStrip regs={regs} />

        {/* Hero */}
        <div style={{ padding: '24px 20px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 8 }}>✝ Prayer Band Journey</div>
          <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{bandId}</div>
          <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic' }}>
            Currently held by {status.currentHolder?.name ?? 'someone'} in {status.currentHolder?.city ?? 'the world'}
          </div>
        </div>

        {/* New holder CTA */}
        {claimStep === 'prompt' && (
          <div style={{
            margin: '20px 20px 0',
            background: 'white', borderRadius: 14, padding: '18px 20px',
            border: `1px solid ${GOLD}`, textAlign: 'center',
          }}>
            <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Do you now have this band?</div>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 14 }}>
              If this band was passed to you, join the chain.
            </div>
            <button
              onClick={() => setClaimStep('form')}
              style={{
                padding: '10px 24px', background: GOLD, color: '#0f0d09',
                border: 'none', borderRadius: 8, fontFamily: serif,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >I now have this band →</button>
          </div>
        )}

        {claimStep === 'form' && (
          <ClaimForm
            title="Join the Chain"
            subtitle="Add your name and prayer to continue this band's journey."
            submitLabel="Join the chain ✝"
            onSubmit={handleClaim}
            onBack={() => setClaimStep('prompt')}
          />
        )}

        {claimStep === 'done' && (
          <SuccessCard
            title="Welcome to the chain"
            subtitle="Your prayer has been added. Tap your band any time to see the full journey."
          />
        )}

        <PrayerChain regs={regs} />
        <div style={{ height: 40 }} />
      </div>
    )
  }

  // ── FIRST TAP BLANK (no purchase, no dedication) ──────
  return (
    <div style={{ background: CREAM, minHeight: '100vh', fontFamily: body, color: DARK }}>
      <Nav />

      {claimStep === 'prompt' && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✝</div>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome to PrayerBands</div>
          <div style={{ fontFamily: body, fontSize: 14, color: GRAY, fontStyle: 'italic', marginBottom: 28, lineHeight: 1.6 }}>
            This band is beginning its journey. Be the first to add a prayer.
          </div>
          <button
            onClick={() => setClaimStep('form')}
            style={{
              padding: '14px 32px', background: GOLD, color: '#0f0d09',
              border: 'none', borderRadius: 10, fontFamily: serif,
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}
          >Start this band's journey →</button>
        </div>
      )}

      {claimStep === 'form' && (
        <ClaimForm
          title="Start the Journey"
          subtitle="Your prayer is the first link in this band's chain."
          submitLabel="Begin the journey ✝"
          onSubmit={handleClaim}
          onBack={() => setClaimStep('prompt')}
        />
      )}

      {claimStep === 'done' && (
        <SuccessCard
          title="The journey has begun"
          subtitle="Your prayer is the first in this band's chain. Every person who holds it next will see what you wrote today."
        />
      )}

      <div style={{ height: 40 }} />
    </div>
  )
}