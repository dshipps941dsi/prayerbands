'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ChurchPage({ params }: { params: { subdomain: string } }) {
  const [org, setOrg] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [prayers, setPrayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/church-public?subdomain=${params.subdomain}`)
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
      justifyContent: 'center', background: '#f7f4ef',
      fontFamily: 'Georgia, serif', color: '#8a7c6a', fontSize: 16,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✝</div>
        <div>Loading...</div>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f7f4ef',
      fontFamily: 'Georgia, serif', textAlign: 'center',
    }}>
      <div>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✝</div>
        <h1 style={{ fontSize: 22, color: '#1a1208', marginBottom: 8 }}>Church not found</h1>
        <p style={{ color: '#8a7c6a', fontSize: 14 }}>This ministry page doesn't exist yet.</p>
        <a href="https://prayerbands.com/onboard" style={{ color: '#1a6b4a', fontSize: 14 }}>
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
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh', color: '#2c2416' }}>
      {/* Header */}
      <div style={{
        background: green, color: '#fff',
        padding: '48px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✝</div>
        <h1 style={{ fontSize: 32, fontWeight: 'bold', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>
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
              background: '#fff', border: '1px solid #e8e1d6',
              borderRadius: 10, padding: '24px 20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: green }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* About */}
        <div style={{
          background: '#fff', border: '1px solid #e8e1d6',
          borderRadius: 10, padding: '28px 32px', marginBottom: 28, textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>🙏</div>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#1a1208' }}>
            Every Band is a Prayer
          </h2>
          <p style={{ fontSize: 15, color: '#5a4f42', lineHeight: 1.8, maxWidth: 500, margin: '0 auto 20px' }}>
            {org.name} gives PrayerBands as acts of intercession. 
            Each band carries a unique ID — when someone receives one, 
            their journey is tracked as a living testimony of prayer traveling the world.
          </p>
          {org.website && (
            <a href={org.website} target="_blank" rel="noopener noreferrer" style={{
              color: green, fontSize: 14, textDecoration: 'none',
              border: `1px solid ${green}`, padding: '8px 20px', borderRadius: 6,
              display: 'inline-block',
            }}>
              Visit {org.name} →
            </a>
          )}
        </div>

        {/* Prayer wall */}
        {prayers.length > 0 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1a1208' }}>
              Recent Prayers
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {prayers.map((p, i) => (
                <div key={i} style={{
                  background: '#fff', border: '1px solid #e8e1d6',
                  borderRadius: 10, padding: '20px 24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 'bold', fontSize: 14 }}>{p.user_name}</span>
                    <span style={{ fontSize: 12, color: '#b0a090' }}>{timeAgo(p.registered_at)}</span>
                  </div>
                  <div style={{ fontSize: 15, color: '#3a2f22', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 8 }}>
                    "{p.prayer}"
                  </div>
                  <div style={{ fontSize: 11, color: green, fontFamily: 'monospace' }}>{p.band_id}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{
          marginTop: 40, background: green, borderRadius: 12,
          padding: '32px', textAlign: 'center', color: '#fff',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✝</div>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
            Received a band from {org.name}?
          </h2>
          <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 20 }}>
            Register your band to join the journey and leave a prayer.
          </p>
          <a href="https://prayerbands.com/register" style={{
            display: 'inline-block', background: '#fff', color: green,
            padding: '12px 28px', borderRadius: 8, textDecoration: 'none',
            fontSize: 15, fontWeight: 'bold',
          }}>
            Register My Band →
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#b0a090' }}>
          <a href="https://prayerbands.com" style={{ color: '#b0a090' }}>Powered by PrayerBands.com</a>
        </div>
      </div>
    </div>
  )
}
