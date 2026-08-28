import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '../../components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import ShareSheet from '@/components/ShareSheet'
import { createServiceClient } from '@/lib/supabase/server'

const SITE = 'https://prayerbands.com'
const NAVY = '#0A1628'
const GOLD = '#C8A96E'

type Testimony = {
  id: string
  title: string
  answered_testimony: string | null
  answered_at: string | null
  firstName: string
}

// Fetched once, reused by both generateMetadata and the page render.
async function getTestimony(id: string): Promise<Testimony | null> {
  // UUID guard — avoids a DB round-trip on obviously bad ids.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null

  const admin = createServiceClient()
  const { data } = await admin
    .from('prayer_requests')
    .select('id, title, answered_testimony, answered_at, status, testimony_public, profiles:user_id(full_name)')
    .eq('id', id)
    .eq('status', 'answered')
    .eq('testimony_public', true)
    .maybeSingle()

  if (!data) return null

  const prof = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles
  const fullName: string = prof?.full_name || ''
  const firstName = fullName.trim().split(/\s+/)[0] || 'A believer'

  return {
    id: data.id,
    title: data.title,
    answered_testimony: data.answered_testimony,
    answered_at: data.answered_at,
    firstName,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const t = await getTestimony(id)

  if (!t) {
    return { title: 'Testimony — Prayer Bands', robots: { index: false, follow: false } }
  }

  const title = `Answered Prayer: ${t.title} — Prayer Bands`
  const description = t.answered_testimony
    ? t.answered_testimony.slice(0, 180)
    : `${t.firstName} marked this prayer as answered. See how prayer is moving on Prayer Bands.`
  const url = `${SITE}/testimony/${t.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: 'Prayer Bands',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function TestimonyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTestimony(id)

  if (!t) {
    return (
      <>
        <SiteHeader />
        <main style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 24px', background: '#F6F1E4' }}>
          <div style={{ fontSize: 40, color: GOLD }}>✝︎</div>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: NAVY, fontSize: 24, margin: '12px 0' }}>This testimony isn&apos;t available</h1>
          <p style={{ fontFamily: 'Inter, sans-serif', color: '#5C6573', maxWidth: 460, marginBottom: 24 }}>
            It may have been kept private or the link is incorrect. There&apos;s still a whole movement of prayer to be part of.
          </p>
          <Link href="/" style={{ background: GOLD, color: NAVY, padding: '12px 26px', borderRadius: 10, fontFamily: 'Cinzel, serif', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 13 }}>
            Explore Prayer Bands
          </Link>
        </main>
        <SiteFooter />
      </>
    )
  }

  const url = `${SITE}/testimony/${t.id}`
  const shareText = `Answered prayer: "${t.title}" 🙏 — a testimony from the Prayer Bands community.`
  const answeredOn = t.answered_at
    ? new Date(t.answered_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <>
      <SiteHeader />
      <main style={{ background: '#F6F1E4', padding: '56px 24px 72px' }}>
        <article style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span style={{ display: 'inline-block', background: NAVY, color: GOLD, fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 999 }}>
              ✨ Prayer Answered
            </span>
          </div>

          <div style={{ background: '#fffdf7', border: '1px solid #e8d8b0', borderRadius: 16, padding: '40px 36px', boxShadow: '0 8px 30px rgba(10,22,40,0.06)' }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', color: NAVY, fontSize: 28, lineHeight: 1.25, margin: '0 0 6px' }}>{t.title}</h1>
            <div style={{ fontFamily: 'Inter, sans-serif', color: '#9a8a6a', fontSize: 13, marginBottom: 24 }}>
              Shared by {t.firstName}{answeredOn ? ` · Answered ${answeredOn}` : ''}
            </div>

            {t.answered_testimony && (
              <blockquote style={{ margin: 0, borderLeft: `4px solid ${GOLD}`, padding: '4px 0 4px 20px' }}>
                <p style={{ fontFamily: 'Georgia, serif', color: '#2a3344', fontSize: 18, lineHeight: 1.7, fontStyle: 'italic', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {t.answered_testimony}
                </p>
              </blockquote>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <ShareSheet url={url} title={t.title} text={shareText} label="Share this testimony" variant="gold" />
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <p style={{ fontFamily: 'Georgia, serif', color: NAVY, fontSize: 17, marginBottom: 18 }}>
              Every Prayer Band carries a prayer around the world. Start yours.
            </p>
            <Link href="/store" style={{ background: NAVY, color: '#F5EDD8', padding: '13px 30px', borderRadius: 10, fontFamily: 'Cinzel, serif', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 13 }}>
              Get a Prayer Band
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  )
}
