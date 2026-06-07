'use client'

import { useState } from 'react'
import NetworkSection from './NetworkSection'
import CirclesSection from './CirclesSection'

const GOLD = '#B8860B'
const GRAY = '#8B7355'
const BORDER = '#E8DCC8'

type Sub = 'requests' | 'partners' | 'circles'
const SUBTABS: { id: Sub; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'partners', label: 'Partners' },
  { id: 'circles', label: 'Circles' },
]

// Segmented Requests / Partners / Circles view used on the band page and
// dashboard Prayers tabs.
export default function PrayerTabs({ userId }: { userId: string }) {
  const [sub, setSub] = useState<Sub>('partners')

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4 }}>
        {SUBTABS.map(t => {
          const active = sub === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              style={{ flex: 1, padding: '9px 4px', border: 'none', borderRadius: 9, background: active ? GOLD : 'transparent', color: active ? '#fff' : GRAY, fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: 'Georgia, serif', cursor: 'pointer' }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {sub === 'requests' && <NetworkSection userId={userId} section="requests" />}
      {sub === 'partners' && <NetworkSection userId={userId} section="partners" />}
      {sub === 'circles' && <CirclesSection userId={userId} />}
    </div>
  )
}
