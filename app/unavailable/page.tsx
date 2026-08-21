import PrayerBandsLogo from '@/components/PrayerBandsLogo'

export const metadata = {
  title: 'Not open here yet — Prayer Bands',
  robots: { index: false, follow: false },
}

// Shown to visitors outside the United States while browsing is restricted.
// Deliberately not a dead end: anyone holding a band can still tap it, and that
// is the one thing that must keep working wherever the band ends up.
export default function UnavailablePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#15223B',
        color: '#F6F1E4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@600&family=Inter:wght@400;500&display=swap');`}</style>

      <div style={{ marginBottom: 30 }}>
        <PrayerBandsLogo size={46} color="#C8A96E" />
      </div>

      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 11,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#C8A96E',
          marginBottom: 18,
        }}
      >
        Prayer Bands
      </div>

      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 34,
          fontWeight: 700,
          lineHeight: 1.2,
          margin: '0 0 16px',
          maxWidth: 460,
        }}
      >
        We haven&rsquo;t opened here yet.
      </h1>

      <p
        style={{
          fontSize: 15.5,
          lineHeight: 1.7,
          color: '#B9C2D0',
          maxWidth: 430,
          margin: '0 0 32px',
        }}
      >
        Prayer Bands is only available in the United States for now, while it is still finding its feet. It will open
        more widely before long &mdash; the map has always been the whole point.
      </p>

      <div
        style={{
          background: 'rgba(200,169,110,0.10)',
          border: '1px solid rgba(200,169,110,0.34)',
          borderRadius: 12,
          padding: '20px 24px',
          maxWidth: 430,
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 8,
            color: '#F6F1E4',
          }}
        >
          Holding a band?
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#B9C2D0', margin: 0 }}>
          It still works. Tap it against your phone, or open the link printed on it, and you will see its journey and be
          able to add your prayer &mdash; wherever in the world you are.
        </p>
      </div>

      <p style={{ fontSize: 13, color: '#7F8CA0', marginTop: 34, fontStyle: 'italic' }}>
        Questions? <a href="mailto:hello@prayerbands.com" style={{ color: '#C8A96E' }}>hello@prayerbands.com</a>
      </p>
    </div>
  )
}
