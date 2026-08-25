'use client'

import { useEffect, useState } from 'react'
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
  { id: 'requests', label: 'Journal' },
  { id: 'partners', label: 'Partners' },
  { id: 'circles', label: 'Circles' },
]

// Short explainers shown when the ⓘ next to the titles is tapped — what each
// section is and where its items come from.
const INFO: Record<Sub, { title: string; body: string }> = {
  requests: {
    title: 'My Prayer Journal',
    body: 'Your journal is your own prayer list. Add what you’re praying for, mark it answered when God moves, and file entries into lists like Family or Health. Every entry is private by default — only you can see it, and no one is notified — until you tap to share it: with your Direct partners, your Lineage, one of your groups, your whole network, or the public wall. A shared prayer shows the people you sent it to how many are praying — not a chat, just a quiet count.',
  },
  partners: {
    title: 'Prayer Partners',
    body: 'Partners are the people you’re connected to in prayer. To add one in person, use “Connect a prayer partner” at the top — read them the code on your band (or show your QR), or enter theirs. “Direct” partners are people you connected with directly; “Lineage” partners are those a band actually passed between. You can sort partners into private groups — Youth Group, Baseball Team — that only you can see, then share a prayer to just that group. “Their Requests” gathers prayers your partners and circles have shared: tap 🙏 to pray, or Mute anyone whose requests you’d rather not see (they’re never told).',
  },
  circles: {
    title: 'Prayer Circles',
    body: 'Circles are private prayer groups — a family, small group, or ministry. Create one and invite people with a join code, or join someone else’s with theirs, right here in this tab. Inside a circle, members post requests and tap to pray over each other’s needs — everyone sees the same requests and how many are praying.',
  },
}

// Segmented Requests / Partners / Circles view used on the band page and
// dashboard Prayers tabs.
// Which explainers this person has dismissed. Kept per device rather than on
// the account: most people meet these tabs holding a band before they have an
// account at all, and a first-run note is worth nothing if it waits for signup.
const SEEN_KEY = 'pb.prayer-tabs.seen'

function readSeen(): Set<Sub> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set(raw ? (JSON.parse(raw) as Sub[]) : [])
  } catch {
    // Private mode, or storage blocked. Showing the note again is a much
    // smaller failure than the tab crashing.
    return new Set()
  }
}

export default function PrayerTabs({ userId, onExpand }: { userId: string; onExpand?: () => void }) {
  const [sub, setSub] = useState<Sub>('requests')
  // Explicitly opened with the ⓘ, per tab.
  const [opened, setOpened] = useState<Set<Sub>>(new Set())
  // Closed for now, without ticking "don't show again".
  const [closed, setClosed] = useState<Set<Sub>>(new Set())
  // null until localStorage has been read — server render and first paint must
  // not guess, or the panel flashes in and out on a tab already dismissed.
  const [seen, setSeen] = useState<Set<Sub> | null>(null)

  useEffect(() => { setSeen(readSeen()) }, [])

  function dismiss(which: Sub) {
    const next = new Set(seen ?? [])
    next.add(which)
    setSeen(next)
    setOpened(prev => { const n = new Set(prev); n.delete(which); return n })
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...next])) } catch {}
  }

  const info = INFO[sub]
  // Shown on the first visit to each tab, and any time the ⓘ is tapped after.
  // `closed` is the middle state: dismissed for now, without ticking the box —
  // otherwise the ⓘ could not close a first-visit panel, since it would just
  // reopen on the next render.
  const firstVisit = seen !== null && !seen.has(sub)
  const showInfo = opened.has(sub) || (firstVisit && !closed.has(sub))

  function toggleInfo() {
    if (showInfo) {
      setOpened(prev => { const n = new Set(prev); n.delete(sub); return n })
      setClosed(prev => new Set(prev).add(sub))
    } else {
      setClosed(prev => { const n = new Set(prev); n.delete(sub); return n })
      setOpened(prev => new Set(prev).add(sub))
    }
  }

  return (
    <div>
      {/* Segmented tabs to switch between the three. */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4 }}>
        {SUBTABS.map(t => {
          const active = sub === t.id
          return (
            <button key={t.id} onClick={() => setSub(t.id)}
              style={{ flex: 1, padding: '9px 4px', border: 'none', borderRadius: 9, background: active ? GOLD : 'transparent', color: active ? INK_ON_PRIMARY : SLATE, fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* The title reads as one phrase that completes with the active tab —
          "My Prayer" in a light italic, the section in bold. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showInfo ? 10 : 16 }}>
        <h3 style={{ margin: 0, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 700, color: NAVY, lineHeight: 1.05 }}>
          <span style={{ fontStyle: 'italic', fontWeight: 400, color: SLATE }}>My Prayer </span>
          {SUBTABS.find(t => t.id === sub)?.label}
        </h3>
        <div style={{ flex: 1 }} />
        <button onClick={toggleInfo} aria-label={`About ${info.title}`} aria-expanded={showInfo} title={`About ${info.title}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', border: `1.5px solid ${showInfo ? GOLD_TEXT : BORDER}`, background: showInfo ? 'rgba(200,169,110,0.14)' : 'transparent', color: showInfo ? GOLD_TEXT : SLATE, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 15, fontWeight: 700, lineHeight: 1, cursor: 'pointer', padding: 0, flexShrink: 0, transition: 'all 0.15s' }}>
          i
        </button>
        {onExpand && (
          <button onClick={onExpand} aria-label="Focus mode" title="Focus mode"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', border: `1.5px solid ${BORDER}`, background: 'transparent', color: SLATE, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
          </button>
        )}
      </div>

      {showInfo && (
        <div style={{ background: CARD, border: `1px solid rgba(200,169,110,0.34)`, borderLeft: `3px solid ${GOLD}`, borderRadius: 10, padding: '14px 16px', marginBottom: 18, boxShadow: '0 2px 12px rgba(10,22,40,0.06)' }}>
          <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, lineHeight: 1.65, color: NAVY }}>{info.body}</div>
          {/* Only on the first visit. Once it has been dismissed the ⓘ is how
              you get it back, and a "don't show again" box on something you
              deliberately opened would be a trap. */}
          {firstVisit && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, color: SLATE }}>
              <input
                type="checkbox"
                onChange={e => { if (e.target.checked) dismiss(sub) }}
                style={{ width: 16, height: 16, accentColor: GOLD, cursor: 'pointer', flexShrink: 0 }}
              />
              Don&rsquo;t show this again &mdash; the ⓘ brings it back
            </label>
          )}
        </div>
      )}

      {sub === 'requests' && <NetworkSection userId={userId} section="requests" />}
      {sub === 'partners' && <NetworkSection userId={userId} section="partners" />}
      {sub === 'circles' && <CirclesSection userId={userId} />}
    </div>
  )
}
