import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import ShareSheet from '@/components/ShareSheet'
import { CATEGORIES, getDailyVerse, getVerseBySlug, verseSlug, type Verse } from '@/lib/verses'

const SITE = 'https://prayerbands.com'
const NAVY = '#0A1628'
const NAVY_LT = '#16294a'
const GOLD = '#C8A96E'
const CREAM = '#F6F1E4'

// Public, no-account verse page — where a shared "Share verse" link lands.
// Reads ?v=<slug> for the exact verse (falls back to today's), and carries an
// optional ?ref=<code> through the call-to-action so a shared verse can also
// credit the sharer if the recipient buys. Referral capture itself is handled
// site-wide by ReferralCapture in the root layout.
type Search = { [key: string]: string | string[] | undefined }
function pick(v: string | string[] | undefined): string { return Array.isArray(v) ? (v[0] || '') : (v || '') }

function resolveVerse(sp: Search): Verse {
  return getVerseBySlug(pick(sp.v)) || getDailyVerse()
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const sp = await searchParams
  const verse = resolveVerse(sp)
  const ref = pick(sp.ref)
  const title = `${verse.ref} — Prayer Bands`
  const description = `"${verse.text}"`
  const url = `${SITE}/verse?v=${verseSlug(verse.ref)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/verse?v=${verseSlug(verse.ref)}` },
    openGraph: { type: 'article', url, title, description, siteName: 'Prayer Bands' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function VersePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const verse = resolveVerse(sp)
  const ref = pick(sp.ref)
  const cat = CATEGORIES.find(c => c.id === verse.category)
  const label = cat && cat.id !== 'all' ? cat.label : "Today's Verse"

  const shareSlug = verseSlug(verse.ref)
  const shareUrl = `${SITE}/verse?v=${shareSlug}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`
  const shareText = `"${verse.text}" — ${verse.ref}`
  // Carry the sharer's referral code into the store so buying credits them.
  const storeHref = ref ? `/store?ref=${encodeURIComponent(ref)}` : '/store'

  return (
    <>
      <SiteHeader />
      <main style={{ background: CREAM, padding: '56px 24px 72px' }}>
        <article style={{ maxWidth: 620, margin: '0 auto' }}>
          {/* The verse itself — no band or account required to read it. */}
          <div style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LT})`, borderRadius: 18, padding: '44px 34px', color: 'white', textAlign: 'center', boxShadow: '0 12px 40px rgba(10,22,40,0.18)' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 18 }}>
              {cat && cat.id !== 'all' ? `${cat.icon} ${label}` : label}
            </div>
            <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 26, fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 18px' }}>
              &ldquo;{verse.text}&rdquo;
            </p>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, opacity: 0.72, fontWeight: 600, letterSpacing: '0.03em' }}>{verse.ref}</div>
          </div>

          {/* Pass it on. */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}>
            <ShareSheet url={shareUrl} title={verse.ref} text={shareText} label="Share this verse" variant="navy" />
          </div>

          {/* Soft on-ramp — meaningful for someone with no band yet. */}
          <div style={{ textAlign: 'center', marginTop: 48, borderTop: '1px solid rgba(10,22,40,0.1)', paddingTop: 40 }}>
            <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', color: NAVY, fontSize: 21, lineHeight: 1.5, margin: '0 auto 8px', maxWidth: 440 }}>
              A verse to hold on to, every day.
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', color: '#5C6573', fontSize: 15, lineHeight: 1.65, margin: '0 auto 26px', maxWidth: 460 }}>
              A Prayer Band carries a prayer around the world — tap it for a daily verse, follow its journey, and pass it on to someone who needs it.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={storeHref} style={{ background: GOLD, color: NAVY, padding: '13px 28px', borderRadius: 10, fontFamily: 'Cinzel, serif', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 13 }}>
                Get a Prayer Band
              </Link>
              <Link href="/" style={{ background: 'transparent', color: NAVY, padding: '13px 28px', borderRadius: 10, border: `1px solid ${GOLD}`, fontFamily: 'Cinzel, serif', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 13 }}>
                How it works
              </Link>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  )
}
