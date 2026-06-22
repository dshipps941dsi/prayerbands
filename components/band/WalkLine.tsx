'use client'

type Props = { total: number; run: number; onOpenJourney: () => void }

// Subtle, tappable "Day N of your walk · M in a row" line that sits above the
// daily verse. Hidden until there's a walk; the "in a row" half only shows once
// the run is at least 2 (a quiet reset to 1 simply disappears — no warning copy).
export default function WalkLine({ total, run, onOpenJourney }: Props) {
  if (!total) return null
  return (
    <button onClick={onOpenJourney}
      aria-label={`Day ${total} of your walk. Open your Journey.`}
      style={{ display: 'block', margin: '2px auto 6px', padding: '2px 6px',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 12.5, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--pb-accent-alt)' }}>
      Day {total} of your walk
      {run >= 2 && (<span style={{ color: 'var(--pb-text-muted)', fontWeight: 400 }}> · {run} in a row</span>)}
    </button>
  )
}
