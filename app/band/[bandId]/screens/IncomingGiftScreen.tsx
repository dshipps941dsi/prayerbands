'use client'


const GOLD = '#C8A96E'
const GOLD_SOFT = '#E2C98A'
const INK = '#0E1E38'
const CREAM = '#F5EDD8'

// Shown on a gift recipient's FIRST tap of a pre-dedicated band, before the
// normal first-tap/claim flow. Reveals who it's from and the message, then
// marks the dedication as viewed and hands off to the claim flow.
export default function IncomingGiftScreen({
  bandId,
  recipient,
  note,
  onProceed,
}: {
  bandId: string
  recipient?: string | null
  note?: string | null
  onProceed: () => void
}) {
  // The blessing is marked "viewed" server-side when the recipient actually
  // registers (in /api/register-band), not here — so closing the tab on the
  // claim form doesn't permanently suppress this reveal.
  function begin() {
    onProceed()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse 90% 60% at 50% 0%, rgba(200,169,110,0.18) 0%, transparent 62%), linear-gradient(180deg, ${INK} 0%, #0A1628 100%)`,
      color: CREAM,
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{ maxWidth: 460, width: '100%', textAlign: 'center', animation: 'giftIn 0.6s ease' }}>
        <style>{`@keyframes giftIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        <div style={{ fontSize: 52, marginBottom: 18, color: GOLD }}>✝</div>

        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD, marginBottom: 18 }}>
          A Gift of Prayer
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(30px, 7vw, 42px)', fontWeight: 700, lineHeight: 1.15, marginBottom: 16 }}>
          This band was sent<br /><em style={{ fontStyle: 'italic', color: GOLD_SOFT }}>especially for you</em>
        </h1>

        {recipient && (
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 600, color: CREAM, marginBottom: 22 }}>
            For {recipient}
          </div>
        )}

        {note && (
          <div style={{
            background: 'rgba(245,237,216,0.08)',
            border: '1px solid rgba(200,169,110,0.34)',
            borderRadius: 14,
            padding: '20px 22px',
            marginBottom: 28,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 18,
            fontStyle: 'italic',
            lineHeight: 1.6,
            color: 'rgba(245,237,216,0.92)',
          }}>
            &ldquo;{note}&rdquo;
          </div>
        )}

        <button
          onClick={begin}
          style={{
            display: 'block',
            width: '100%',
            padding: '16px',
            background: GOLD,
            color: INK,
            border: 'none',
            borderRadius: 12,
            fontFamily: "'Cinzel', serif",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(200,169,110,0.25)',
          }}
        >
          Begin Your Journey →
        </button>

        <div style={{ marginTop: 18, fontSize: 12, color: 'rgba(245,237,216,0.4)', fontFamily: 'monospace' }}>{bandId}</div>
      </div>
    </div>
  )
}
