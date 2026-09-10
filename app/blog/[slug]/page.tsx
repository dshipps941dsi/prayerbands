import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SiteHeader from '../../components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { getAllPosts, getPost, renderMarkdown, formatDate } from '@/lib/blog'
import { blogStyles } from '../styles'

const SITE = 'https://prayerbands.com'

// Scheduled posts: a slug not built at deploy time renders on first request
// once its date arrives, and every post page refreshes hourly.
export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: 'Not found — Prayer Bands' }
  const url = `${SITE}/blog/${post.slug}`
  const image = post.image || '/home/og.jpg'
  return {
    title: `${post.title} — Prayer Bands`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article', url, title: post.title, description: post.description, siteName: 'Prayer Bands',
      publishedTime: `${post.date}T12:00:00Z`, modifiedTime: `${post.updated || post.date}T12:00:00Z`,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description, images: [image] },
  }
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  // Future-dated posts stay hidden until their day, matching the index.
  if (!post || post.date > new Date().toISOString().slice(0, 10)) notFound()

  const html = renderMarkdown(post.body)
  const related = getAllPosts()
    .filter(p => p.slug !== post.slug)
    .sort((a, b) => b.tags.filter(t => post.tags.includes(t)).length - a.tags.filter(t => post.tags.includes(t)).length)
    .slice(0, 3)

  // Article structured data: what Google reads to show the date, author and
  // image in results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    image: [`${SITE}${post.image || '/home/og.jpg'}`],
    author: { '@type': 'Organization', name: 'Prayer Bands', url: SITE },
    publisher: { '@type': 'Organization', name: 'Prayer Bands', url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-192.png` } },
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
  }

  return (
    <div className="pbb-page">
      <style>{blogStyles}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <section className="pbb-hero pbb-post-hero">
        <div className="pbb-eyebrow">✝︎ The Blog</div>
        <h1 className="pbb-title">{post.title}</h1>
        <div className="pbb-post-meta">{formatDate(post.date)} · {post.readingMinutes} min read</div>
      </section>

      <article className="pbb-article">
        <div className="pbb-prose" dangerouslySetInnerHTML={{ __html: html }} />
        <Link href="/blog" className="pbb-back">← All posts</Link>
      </article>

      <div className="pbb-cta">
        <div className="pbb-cta-box">
          <div className="pbb-cta-title">Pray for someone by name this week</div>
          <p className="pbb-cta-copy">A Prayer Band is a waterproof wristband you tap with your phone. Give one, and every prayer you send travels with the person wearing it.</p>
          <a href="/store" className="pbb-cta-btn">See the bands</a>
        </div>
      </div>

      {related.length > 0 && (
        <div className="pbb-related">
          <div className="pbb-related-title">Keep reading</div>
          <div className="pbb-grid">
            {related.map(p => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="pbb-card">
                <div className="pbb-card-meta">{formatDate(p.date)} · {p.readingMinutes} min</div>
                <h3 className="pbb-card-title">{p.title}</h3>
                <p className="pbb-card-desc">{p.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  )
}
