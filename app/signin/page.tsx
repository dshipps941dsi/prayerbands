'use client'

import Logo from '@/components/Logo'

export default function SignInChooser() {
  const green = '#1a6b4a'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f7f4ef', fontFamily: 'Georgia, serif',
      padding: '24px 16px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Logo size={44} /></div>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✝</div>
        <h1 style={{ fontSize: 26, fontWeight: 'bold', color: '#1a1208', margin: '0 0 8px' }}>
          Welcome to PrayerBands
        </h1>
        <p style={{ fontSize: 15, color: '#8a7c6a', margin: 0 }}>
          How would you like to sign in?
        </p>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 16,
        width: '100%', maxWidth: 420,
      }}>
        {/* Personal */}
        <a href="/signin/personal" style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '28px 28px',
            border: '1px solid #e8e1d6', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            cursor: 'pointer', transition: 'box-shadow 0.15s',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🙏</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1a1208', marginBottom: 6 }}>
              I have a band
            </div>
            <div style={{ fontSize: 14, color: '#8a7c6a', lineHeight: 1.6 }}>
              Sign in to see your band's journey, leave prayers, and track where it has traveled.
            </div>
            <div style={{ marginTop: 16, display: 'inline-block', background: green, color: '#fff', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 'bold' }}>
              Sign in →
            </div>
          </div>
        </a>

        {/* Church / Org */}
        <a href="/signin/org" style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '28px 28px',
            border: '1px solid #e8e1d6', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            cursor: 'pointer',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⛪</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1a1208', marginBottom: 6 }}>
              I represent a church or ministry
            </div>
            <div style={{ fontSize: 14, color: '#8a7c6a', lineHeight: 1.6 }}>
              Access your ministry dashboard, order bands, and track your church's impact.
            </div>
            <div style={{ marginTop: 16, display: 'inline-block', background: '#fff', color: green, border: '2px solid ' + green, borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 'bold' }}>
              Ministry sign in →
            </div>
          </div>
        </a>
      </div>

      <div style={{ marginTop: 32, fontSize: 13, color: '#b0a090', textAlign: 'center' }}>
        New church or ministry?{' '}
        <a href="/onboard" style={{ color: green, textDecoration: 'none', fontWeight: 'bold' }}>
          Set up your account →
        </a>
      </div>
    </div>
  )
}