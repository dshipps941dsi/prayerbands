'use client'

import { useState } from 'react'
import NetworkSection from './NetworkSection'
import CirclesSection from './CirclesSection'

// Colors follow the band's theme via --pb-* tokens (fallbacks = brand palette).
const GOLD = 'var(--pb-primary, #C8A96E)'
const GOLD_TEXT = 'var(--pb-accent, #9A7A35)'
const NAVY = 'var(--pb-text, #15223B)'
const SLATE = 'var(--pb-text-muted, #5C6573)'
const BORDER = 'var(--pb-border, rgba(92,101,115,0.20))'
const CARD = 'var(--pb-surface, #FFFDF8)'
const INK_ON_PRIMARY = 'var(--pb-text-on-primary, #0A1628)'

type Sub = 'requests' | 'partners' | 'circles'
const SUBTABS: { id: Sub; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'partners', label: 'Partners' },
  { id: 'circles', label: 'Circles' },
]

// Short explainers shown when the ⓘ next to the titles is tapped — what each
// section is and where its items come from.
const INFO: Record<Sub, { title: string; body: string }> = {
  requests: {
    title: 'Prayer Requests',
    body: 'Requests are specific needs people ask prayer for. The “Pray for Others” list shows requests shared by people in your prayer network — those connected through your bands’ journeys and the circles you’re in. Your own requests appear under “My Requests,” and anyone in your network can lift them up.',
  },
  partners: {
    title: 'Prayer Partners',
    body: 'Partners are the people you’re connected to in prayer. They come from the bands you’ve held or passed on (everyone in that band’s journey) and the members of any circles you join. Your partners can see and pray over the requests you choose to share with your network.',
  },
  circles: {
    title: 'Prayer Circles',
    body: 'Circles are private prayer groups — a family, small group, or ministry. You can create one and invite people with a join code, or join someone else’s with their code. Inside a circle, members post requests and pray over each other’s needs together.',
  },
}

// Segmented Requests / Partners / Circles view used on the band page and
// dashboard Prayers tabs.
export default function PrayerTabs({ userId }: { userId: string }) {
  const [sub, setSub] = useState<Sub>('requests')
  const [showInfo, setShowInfo] = useState(false)

  const info = INFO[sub]

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4 }}>
        {SUBTABS.map(t => {
          const active = sub === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              style={{ flex: 1, padding: '9px 4px', border: 'none', borderRadius: 9, background: active ? GOLD : 'transparent', color: active ? INK_ON_PRIMARY : SLATE, fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Active section title + info toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showInfo ? 10 : 18 }}>
        <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontWeight: 700, color: NAVY }}>{info.title}</span>
        <button
          onClick={() => setShowInfo(v => !v)}
          aria-label={`What ${info.title.toLowerCase()} are`}
          aria-expanded={showInfo}
          title={`About ${info.title}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${showInfo ? GOLD_TEXT : BORDER}`, background: showInfo ? 'rgba(200,169,110,0.14)' : 'transparent', color: showInfo ? GOLD_TEXT : SLATE, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 12, fontWeight: 700, lineHeight: 1, cursor: 'pointer', padding: 0, flexShrink: 0, transition: 'all 0.15s' }}
        >
          i
        </button>
      </div>

      {showInfo && (
        <div style={{ background: CARD, border: `1px solid rgba(200,169,110,0.34)`, borderLeft: `3px solid ${GOLD}`, borderRadius: 10, padding: '14px 16px', marginBottom: 18, boxShadow: '0 2px 12px rgba(10,22,40,0.06)' }}>
          <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, lineHeight: 1.65, color: NAVY }}>{info.body}</div>
        </div>
      )}

      {sub === 'requests' && <NetworkSection userId={userId} section="requests" />}
      {sub === 'partners' && <NetworkSection userId={userId} section="partners" />}
      {sub === 'circles' && <CirclesSection userId={userId} />}
    </div>
  )
}
