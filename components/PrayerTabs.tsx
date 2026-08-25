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
      {/* One line: "My Prayer" + the tab that completes it (Journal / Partners /
          Circles) + the ⓘ. Replaces a separate eyebrow, tab bar, and a repeated
          title — reads "My Prayer Journal" and reclaims two rows of height. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showInfo ? 10 : 16 }}>
        <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, fontWeight: 700, color: NAVY, whiteSpace: 'nowrap' }}>My Prayer</span>
        <div style={{ flex: 1, display: 'flex', gap: 3, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3 }}>
          {SUBTABS.map(t => {
            const active = sub === t.id
            return (
              <button key={t.id} onClick={() => setSub(t.id)}
                style={{ flex: 1, padding: '7px 4px', border: 'none', borderRadius: 8, background: active ? GOLD : 'transparent', color: active ? INK_ON_PRIMARY : SLATE, fontSize: 11, fontWeight: active ? 700 : 500, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {t.label}
              </button>
            )
          })}
        </div>
        <button onClick={toggleInfo} aria-label={`About ${info.title}`} aria-expanded={showInfo} title={`About ${info.title}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${showInfo ? GOLD_TEXT : BORDER}`, background: showInfo ? 'rgba(200,169,110,0.14)' : 'transparent', color: showInfo ? GOLD_TEXT : SLATE, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 12, fontWeight: 700, lineHeight: 1, cursor: 'pointer', padding: 0, flexShrink: 0, transition: 'all 0.15s' }}>
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
