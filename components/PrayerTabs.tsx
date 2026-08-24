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
    body: 'Your journal is your own prayer list. Add what you’re praying for, and mark it answered when God moves. Every entry is private by default — only you can see it, and no one is notified — until you tap to share it with your Direct partners, your Lineage, your whole network, or the public wall.',
  },
  partners: {
    title: 'Prayer Partners',
    body: 'Partners are the people you’re connected to in prayer. To add one in person, use “Connect a prayer partner” at the top — read them the code on your band, or enter theirs. “Lineage” partners are those a band actually passed between; “Direct” partners are people you connected with directly. Below them, “Their Requests” gathers the prayers your partners and circles have shared — tap 🙏 to let them know you’re praying.',
  },
  circles: {
    title: 'Prayer Circles',
    body: 'Circles are private prayer groups — a family, small group, or ministry. You can create one and invite people with a join code, or join someone else’s with their code. Inside a circle, members post requests and pray over each other’s needs together.',
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

export default function PrayerTabs({ userId }: { userId: string }) {
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
      <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_TEXT, marginBottom: 8 }}>My Prayer</div>
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
          onClick={toggleInfo}
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
