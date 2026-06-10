'use client'

import Logo from '@/components/Logo'

// Brand palette: navy + gold + silver/gray on cream
const BRAND = {
  pageBg: '#F6F1E4',
  cardBg: '#FFFDF8',
  navy: '#0A1628',
  navyMid: '#15223B',
  gold: '#C8A96E',
  goldText: '#9A7A35',
  goldDark: '#5A3E12',
  silver: '#C9CFD6',
  silverBorder: 'rgba(92,101,115,0.20)',
  goldBorder: 'rgba(200,169,110,0.34)',
  navyBorder: 'rgba(10,22,40,0.12)',
  bodyText: '#2A3344',
  secondaryText: '#5C6573',
  mutedText: '#7A8494',
  // Bold navy + gold page backdrop (the gold/cream cards sit on top of this)
  splash: 'radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%), linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%)',
  cream: '#F5EDD8',
  creamSoft: 'rgba(245,237,216,0.78)',
}

export default function SignInChooser() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .signin-card:hover { box-shadow: 0 6px 28px rgba(10,22,40,0.13) !important; }
      `}</style>
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: BRAND.splash,
        fontFamily: "'Inter', sans-serif",
        padding: '24px 16px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Logo size={44} color={BRAND.gold} /></div>
          <div style={{ fontSize: 13, letterSpacing: '0.14em', color: BRAND.gold, fontFamily: "'Cinzel', serif", textTransform: 'uppercase', marginBottom: 10 }}>Welcome</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: BRAND.cream, margin: '0 0 8px', fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.2 }}>
            Welcome to PrayerBands
          </h1>
          <p style={{ fontSize: 15, color: BRAND.creamSoft, margin: 0, fontFamily: "'Inter', sans-serif" }}>
            How would you like to sign in?
          </p>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 16,
          width: '100%', maxWidth: 420,
        }}>
          {/* Personal */}
          <a href="/signin/personal" style={{ textDecoration: 'none' }}>
            <div className="signin-card" style={{
              background: BRAND.cardBg, borderRadius: 14, padding: '28px 28px',
              border: `1px solid ${BRAND.goldBorder}`,
              boxShadow: '0 2px 16px rgba(10,22,40,0.07)',
              cursor: 'pointer', transition: 'box-shadow 0.15s',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🙏</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: BRAND.navyMid, marginBottom: 6, fontFamily: "'Cormorant Garamond', serif" }}>
                I have a band
              </div>
              <div style={{ fontSize: 14, color: BRAND.secondaryText, lineHeight: 1.6, marginBottom: 16, borderBottom: `1px solid ${BRAND.silverBorder}`, paddingBottom: 16 }}>
                Sign in to see your band's journey, leave prayers, and track where it has traveled.
              </div>
              <div style={{ display: 'inline-block', background: BRAND.gold, color: BRAND.navy, borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 700, fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Sign In
              </div>
            </div>
          </a>

          {/* Church / Org */}
          <a href="/signin/org" style={{ textDecoration: 'none' }}>
            <div className="signin-card" style={{
              background: BRAND.cardBg, borderRadius: 14, padding: '28px 28px',
              border: `1px solid ${BRAND.silverBorder}`,
              boxShadow: '0 2px 16px rgba(10,22,40,0.07)',
              cursor: 'pointer', transition: 'box-shadow 0.15s',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⛪</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: BRAND.navyMid, marginBottom: 6, fontFamily: "'Cormorant Garamond', serif" }}>
                I represent a church or ministry
              </div>
              <div style={{ fontSize: 14, color: BRAND.secondaryText, lineHeight: 1.6, marginBottom: 16, borderBottom: `1px solid ${BRAND.silverBorder}`, paddingBottom: 16 }}>
                Access your ministry dashboard, order bands, and track your church's impact.
              </div>
              <div style={{ display: 'inline-block', background: 'transparent', color: BRAND.goldText, border: `2px solid ${BRAND.gold}`, borderRadius: 8, padding: '7px 20px', fontSize: 12, fontWeight: 700, fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Ministry Sign In
              </div>
            </div>
          </a>
        </div>

        <div style={{ marginTop: 32, fontSize: 13, color: BRAND.creamSoft, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
          New church or ministry?{' '}
          <a href="/onboard" style={{ color: BRAND.gold, textDecoration: 'none', fontWeight: 600 }}>
            Set up your account →
          </a>
        </div>
      </div>
    </>
  )
}
