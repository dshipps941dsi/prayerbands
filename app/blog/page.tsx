import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { getAllPosts, formatDate } from '@/lib/blog'
import { blogStyles } from './styles'

export const metadata: Metadata = {
  title: 'Blog — Prayer Bands',
  description: 'Practical help for praying for the people in your life: by name, with a partner, as a family, and through the seasons of the year.',
  alternates: { canonical: 'https://prayerbands.com/blog', types: { 'application/rss+xml': 'https://prayerbands.com/feed.xml' } },
  openGraph: { type: 'website', url: 'https://prayerbands.com/blog', title: 'The Prayer Bands Blog', description: 'Practical help for praying for the people in your life.' },
}

export default function BlogIndex() {
  const posts = getAllPosts()
  const [lead, ...rest] = posts

  return (
    <div className="pbb-page">
      <style>{blogStyles}</style>
      <SiteHeader />

      <section className="pbb-hero">
        <div className="pbb-eyebrow">✝︎ The Blog</div>
        <h1 className="pbb-title">Praying for people,<br /><em>by name</em></h1>
        <p className="pbb-sub">Short, practical pieces on praying for the people in your life — by name, with a partner, as a family, and through the seasons.</p>
      </section>

      <main className="pbb-wrap">
        {posts.length === 0 ? (
          <p className="pbb-empty">First posts are on the way.</p>
        ) : (
          <>
            <Link href={`/blog/${lead.slug}`} className="pbb-lead">
              <div className="pbb-lead-meta">{formatDate(lead.date)} · {lead.readingMinutes} min read</div>
              <h2 className="pbb-lead-title">{lead.title}</h2>
              <p className="pbb-lead-desc">{lead.description}</p>
              <span className="pbb-more">Read →</span>
            </Link>
            {rest.length > 0 && (
              <div className="pbb-grid">
                {rest.map(p => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="pbb-card">
                    <div className="pbb-card-meta">{formatDate(p.date)} · {p.readingMinutes} min</div>
                    <h3 className="pbb-card-title">{p.title}</h3>
                    <p className="pbb-card-desc">{p.description}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
