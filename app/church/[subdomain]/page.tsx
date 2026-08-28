'use client'
import { useState, useEffect } from 'react'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

// Brand font import
if (typeof document !== 'undefined' && !document.getElementById('pb-brand-fonts')) {
  const link = document.createElement('link')
  link.id = 'pb-brand-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap'
  document.head.appendChild(link)
}

const CREAM_BG = '#F6F1E4'
const CARD_BG = '#FFFDF8'
const NAVY = '#0A1628'
const NAVY_HEADING = '#15223B'
const BODY_TEXT = '#2A3344'
const GOLD = '#C8A96E'
const GOLD_TEXT = '#9A7A35'
const SILVER_BORDER = 'rgba(92,101,115,0.20)'
const NAVY_BORDER = 'rgba(10,22,40,0.12)'
const SECONDARY_TEXT = '#5C6573'

export default function ChurchPage({ params }: { params: { subdomain: string } }) {
  const [org, setOrg] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [prayers, setPrayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      // Get subdomain from hostname or pathname
      const hostname = window.location.hostname
      const hostParts = hostname.split('.')
      const subdomain = hostParts.length === 3 ? hostParts[0] : params.subdomain
      const res = await fetch(`https://prayerbands.com/api/church-public?subdomain=${subdomain}`)
      if (!res.ok) { setNotFound(true); setLoading(false); return }
      const { org, stats, prayers } = await res.json()
      setOrg(org)
      setStats(stats)
      setPrayers(prayers)
      setLoading(false)
    }
    load()
  }, [params.subdomain])

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: CREAM_BG,
      fontFamily: 'Cinzel, serif', color: SECONDARY_TEXT, fontSize: 16,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12, color: GOLD }}>✝︎</div>
        <div style={{ letterSpacing: '0.05em' }}>Loading...</div>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: CREAM_BG,
      fontFamily: 'Inter, sans-serif', textAlign: 'center',
    }}>
      <div>
        <div style={{ fontSize: 40, marginBottom: 12, color: GOLD }}>✝︎</div>
        <h1 style={{ fontSize: 22, color: NAVY_HEADING, marginBottom: 8, fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700 }}>Church not found</h1>
        <p style={{ color: SECONDARY_TEXT, fontSize: 14 }}>This ministry page doesn't exist yet.</p>
        <a href="https://prayerbands.com/onboard" style={{ color: GOLD_TEXT, fontSize: 14, fontWeight: 600 }}>
          Set up your church →
        </a>
      </div>
    </div>
  )

  const green = org?.color || '#1a6b4a'

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: CREAM_BG, minHeight: '100vh', color: BODY_TEXT }}>
      {/* Header */}
      <div style={{
        background: green, color: '#fff',
        padding: '48px 32px', textAlign: 'center',
      }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><PrayerBandsLogo size={44} color="#fff" /></div>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
          {org.name}
        </h1>
        {org.location && (
          <div style={{ fontSize: 15, opacity: 0.8, marginBottom: 16 }}>{org.location}</div>
        )}
        <div style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 20, padding: '4px 16px',
          fontSize: 13, fontFamily: 'monospace', letterSpacing: 1,
        }}>
          {org.prefix}-XXXXX
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'Bands in the World', value: stats?.total_bands || 0 },
            { label: 'Prayers Offered', value: stats?.total_prayers || 0 },
            { label: 'Countries Reached', value: stats?.countries || 0 },
          ].map(s => (
            <div key={s.label} style={{
              background: CARD_BG, border: `1px solid ${SILVER_BORDER}`,
              borderRadius: 10, padding: '24px 20px', textAlign: 'center',
              boxShadow: '0 1px 4px rgba(10,22,40,0.06)',
            }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: SECONDARY_TEXT, marginTop: 4, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* About */}
        <div style={{
          background: CARD_BG, border: `1px solid ${NAVY_BORDER}`,
          borderRadius: 10, padding: '28px 32px', marginBottom: 28, textAlign: 'center',
          boxShadow: '0 1px 6px rgba(10,22,40,0.06)',
        }}>
          <div style={{ fontSize: 24, marginBottom: 12, color: GOLD }}>🙏</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            Every Band is a Prayer
          </h2>
          <p style={{ fontSize: 15, color: BODY_TEXT, lineHeight: 1.8, maxWidth: 500, margin: '0 auto 20px', fontFamily: 'Inter, sans-serif' }}>
            {org.name} gives Prayer Bands as acts of intercession.
            Each band carries a unique ID — when someone receives one,
            their journey is tracked as a living testimony of prayer traveling the world.
          </p>
          {org.website && (
            <a href={org.website} target="_blank" rel="noopener noreferrer" style={{
              color: '#fff', fontSize: 12, textDecoration: 'none',
              background: green, padding: '10px 20px', borderRadius: 6,
              display: 'inline-block', fontFamily: 'Cinzel, serif', fontWeight: 700,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Visit {org.name} →
            </a>
          )}
        </div>

        {/* Prayer wall */}
        {prayers.length > 0 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              Recent Prayers
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {prayers.map((p, i) => (
                <div key={i} style={{
                  background: CARD_BG, border: `1px solid ${NAVY_BORDER}`,
                  borderLeft: `3px solid ${green}`,
                  borderRadius: 10, padding: '20px 24px',
                  boxShadow: '0 1px 4px rgba(10,22,40,0.05)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: NAVY_HEADING, fontFamily: 'Inter, sans-serif' }}>{p.user_name}</span>
                    <span style={{ fontSize: 12, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>{timeAgo(p.registered_at)}</span>
                  </div>
                  <div style={{ fontSize: 15, color: BODY_TEXT, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 8, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                    "{p.prayer}"
                  </div>
                  <div style={{ fontSize: 11, color: GOLD_TEXT, fontFamily: 'monospace' }}>{p.band_id}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{
          marginTop: 40, background: `linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.22) 100%), ${green}`, borderRadius: 12,
          padding: '32px', textAlign: 'center', color: '#fff',
          border: `1px solid ${GOLD}33`, boxShadow: '0 4px 20px rgba(10,22,40,0.2)',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8, color: GOLD }}>✝︎</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            Received a band from {org.name}?
          </h2>
          <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>
            Register your band to join the journey and leave a prayer.
          </p>
          <a href="https://prayerbands.com/register" style={{
            display: 'inline-block', background: GOLD, color: NAVY,
            padding: '12px 28px', borderRadius: 8, textDecoration: 'none',
            fontSize: 12, fontWeight: 700, fontFamily: 'Cinzel, serif',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Register My Band →
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>
          <a href="https://prayerbands.com" style={{ color: SECONDARY_TEXT }}>Powered by PrayerBands.com</a>
        </div>
      </div>
    </div>
  )
}
