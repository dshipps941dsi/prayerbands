'use client'
import React, { useEffect, useState } from 'react'
import GiftDedications from '@/components/GiftDedications'

// "My Bands" on the Account tab: every band this person holds or owns, what
// each one is, and the two things they do with a band — open it, or pass it
// on — plus the gift message for any band they bought that hasn't been
// opened yet. This is the band management that used to live only on the old
// dashboard.

type Band = { band_id: string; label: string | null; giving?: boolean; for_name?: string | null }

const GOLD = 'var(--pb-primary, #B8860B)'
const DARK = 'var(--pb-text, #2C1810)'
const GRAY = 'var(--pb-text-muted, #7A6A5A)'
const INK = 'var(--pb-text-on-primary, #0f0d09)'
const serif = "'Playfair Display', Georgia, serif"
const body = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

export default function MyBandsPanel({ userId, currentBandId, defaultBandId, openDedication = null, defaultOpen = true }: { userId: string | null; currentBandId: string; defaultBandId: string | null; openDedication?: string | null; defaultOpen?: boolean }) {
  const [bands, setBands] = useState<Band[] | null>(null)
  const [open, setOpen] = useState(defaultOpen)
  // The account menu collapses this when it sends someone to the inbox below.
  useEffect(() => { setOpen(defaultOpen) }, [defaultOpen])

  useEffect(() => {
    if (!userId) { setBands([]); return }
    fetch('/api/my-bands').then(r => r.ok ? r.json() : null).then(d => setBands(d?.bands ?? [])).catch(() => setBands([]))
  }, [userId])

  if (!userId) return null

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '4px 18px', border: '1px solid rgba(44,24,16,0.1)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: '14px 0', cursor: 'pointer', textAlign: 'left' }}>
        <span aria-hidden="true" style={{ fontSize: 16 }}>⟳</span>
        <span style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: DARK }}>My Bands</span>
        {bands && bands.length > 0 && <span style={{ fontFamily: body, fontSize: 12, color: GRAY }}>· {bands.length}</span>}
        <span style={{ marginLeft: 'auto', color: GRAY, fontSize: 13, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>

      {open && (
        <div style={{ paddingBottom: 14 }}>
          {bands === null ? (
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, padding: '4px 0 10px' }}>Loading…</div>
          ) : bands.length === 0 ? (
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, padding: '4px 0 10px' }}>No bands on your account yet. Tap a band and add it, or it lands here when you order one.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {[...bands.filter(b => !b.giving), ...bands.filter(b => b.giving)].map((b, i, arr) => {
                const isThis = b.band_id === currentBandId
                const giveCount = arr.filter(x => x.giving).length
                // Headings only when there is stock to give: "Wearing" above
                // the worn bands, "To give away · n" above the drawer.
                const heading = giveCount && giveCount < arr.length
                  ? (i === 0 ? 'Wearing' : (b.giving && !arr[i - 1].giving) ? `To give away · ${giveCount}` : null)
                  : (giveCount && i === 0 ? `To give away · ${giveCount}` : null)
                return (<React.Fragment key={b.band_id}>
                  {heading && <div style={{ fontFamily: body, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: GRAY, margin: i === 0 ? '2px 0 0' : '10px 0 0' }}>{heading}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${isThis ? GOLD : 'rgba(44,24,16,0.12)'}`, borderRadius: 10, background: isThis ? 'rgba(184,134,11,0.06)' : 'white' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: serif, fontSize: 14.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.label || b.band_id}
                        {defaultBandId === b.band_id && <span title="The app opens to this band" style={{ marginLeft: 6, color: GOLD, fontSize: 12 }}>★</span>}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: GRAY }}>{b.band_id}{isThis ? ' · this band' : ''}{b.giving ? <span style={{ fontFamily: body, color: GOLD, fontWeight: 600 }}> · {b.for_name ? `for ${b.for_name}` : 'to give away'}</span> : ''}</div>
                    </div>
                    {!isThis && (
                      <a href={`/band/${b.band_id}`} style={{ flexShrink: 0, fontFamily: body, fontSize: 12.5, fontWeight: 600, color: DARK, textDecoration: 'none', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, padding: '7px 11px' }}>Open</a>
                    )}
                    <a href={`/band/${b.band_id}?action=pass`} style={{ flexShrink: 0, fontFamily: serif, fontSize: 12.5, fontWeight: 700, color: INK, background: GOLD, textDecoration: 'none', borderRadius: 8, padding: '7px 12px' }}>Pass on →</a>
                  </div>
                </React.Fragment>)
              })}
            </div>
          )}

          {/* Gift messages for bands bought but not yet opened by their
              recipient. Renders nothing when there are none. */}
          <GiftDedications userId={userId} autoOpen={openDedication} />

        </div>
      )}
    </div>
  )
}
