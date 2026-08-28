import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '../../components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import ShareSheet from '@/components/ShareSheet'
import { createServiceClient } from '@/lib/supabase/server'

const SITE = 'https://prayerbands.com'
const NAVY = '#0A1628'
const GOLD = '#C8A96E'

// Public invite view of a circle. Deliberately shows ONLY safe aggregates —
// name, description, member count, and how many active requests there are —
// never the prayer-request text itself, which is private to members.
type PublicCircle = {
  id: string
  name: string
  description: string | null
  join_code: string
  memberCount: number
  activeRequests: number
  isClosed: boolean
}

async function getCircle(id: string): Promise<PublicCircle | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null

  const admin = createServiceClient()
  const { data: circle } = await admin
    .from('prayer_circles')
    .select('id, name, description, join_code, is_closed')
    .eq('id', id)
    .maybeSingle()

  if (!circle) return null

  const [{ count: memberCount }, { count: activeRequests }] = await Promise.all([
    admin.from('circle_members').select('id', { count: 'exact', head: true }).eq('circle_id', id),
    admin.from('circle_prayer_requests').select('id', { count: 'exact', head: true }).eq('circle_id', id).eq('is_answered', false),
  ])

  return {
    id: circle.id,
    name: circle.name,
    description: circle.description,
    join_code: circle.join_code,
    memberCount: memberCount || 0,
    activeRequests: activeRequests || 0,
    isClosed: !!circle.is_closed,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ circleId: string }> }): Promise<Metadata> {
  const { circleId } = await params
  const c = await getCircle(circleId)

  if (!c) return { title: 'Prayer Circle — Prayer Bands', robots: { index: false, follow: false } }

  const title = `${c.name} — a Prayer Circle on Prayer Bands`
  const description = c.description || `Join ${c.memberCount} ${c.memberCount === 1 ? 'person' : 'people'} praying together in this circle.`
  const url = `${SITE}/circle/${c.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title, description, siteName: 'Prayer Bands' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PublicCirclePage({ params }: { params: Promise<{ circleId: string }> }) {
  const { circleId } = await params
  const c = await getCircle(circleId)

  if (!c) {
    return (
      <>
        <SiteHeader />
        <main style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 24px', background: '#F6F1E4' }}>
          <div style={{ fontSize: 40, color: GOLD }}>✝︎</div>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: NAVY, fontSize: 24, margin: '12px 0' }}>This circle isn&apos;t available</h1>
          <p style={{ fontFamily: 'Inter, sans-serif', color: '#5C6573', maxWidth: 460, marginBottom: 24 }}>The link may be incorrect. You can still start or find a circle of your own.</p>
          <Link href="/circles" style={{ background: GOLD, color: NAVY, padding: '12px 26px', borderRadius: 10, fontFamily: 'Cinzel, serif', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 13 }}>Explore Circles</Link>
        </main>
        <SiteFooter />
      </>
    )
  }

  const url = `${SITE}/circle/${c.id}`
  const viewUrl = `/circles/${c.id}?code=${encodeURIComponent(c.join_code)}`
  const shareText = `Join our Prayer Circle "${c.name}" on Prayer Bands 🙏`

  return (
    <>
      <SiteHeader />
      <main style={{ background: '#F6F1E4', padding: '56px 24px 72px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ display: 'inline-block', background: NAVY, color: GOLD, fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 999 }}>Prayer Circle</span>
          </div>

          <div style={{ background: '#fffdf7', border: '1px solid #e8d8b0', borderRadius: 16, padding: '40px 36px', textAlign: 'center', boxShadow: '0 8px 30px rgba(10,22,40,0.06)' }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', color: NAVY, fontSize: 28, margin: '0 0 10px' }}>{c.name}</h1>
            {c.description && (
              <p style={{ fontFamily: 'Georgia, serif', color: '#2a3344', fontSize: 17, lineHeight: 1.6, margin: '0 0 22px' }}>{c.description}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 36, margin: '0 0 28px' }}>
              <div>
                <div style={{ fontFamily: 'Cinzel, serif', color: GOLD, fontSize: 26, fontWeight: 700 }}>{c.memberCount}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', color: '#9a8a6a', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.memberCount === 1 ? 'Member' : 'Members'}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'Cinzel, serif', color: GOLD, fontSize: 26, fontWeight: 700 }}>{c.activeRequests}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', color: '#9a8a6a', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active {c.activeRequests === 1 ? 'Prayer' : 'Prayers'}</div>
              </div>
            </div>

            {c.isClosed ? (
              <p style={{ fontFamily: 'Inter, sans-serif', color: '#9a8a6a', fontSize: 14 }}>This circle is currently closed to new members.</p>
            ) : (
              <>
                <div style={{ fontFamily: 'Inter, sans-serif', color: '#9a8a6a', fontSize: 13, marginBottom: 8 }}>Join code</div>
                <div style={{ fontFamily: 'monospace', fontSize: 24, letterSpacing: '0.18em', color: NAVY, fontWeight: 700, marginBottom: 22 }}>{c.join_code}</div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href={viewUrl} style={{ background: NAVY, color: '#F5EDD8', padding: '13px 28px', borderRadius: 10, fontFamily: 'Cinzel, serif', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 13 }}>View this circle</Link>
                  <ShareSheet url={url} title={c.name} text={shareText} label="Share" variant="gold" />
                </div>
              </>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <p style={{ fontFamily: 'Georgia, serif', color: NAVY, fontSize: 16, marginBottom: 16 }}>Prayer Circles are unlocked with a Prayer Band.</p>
            <Link href="/store" style={{ background: GOLD, color: NAVY, padding: '12px 26px', borderRadius: 10, fontFamily: 'Cinzel, serif', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 13 }}>Get a Prayer Band</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
