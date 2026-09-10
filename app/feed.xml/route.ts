import { getAllPosts } from '@/lib/blog'

// RSS for the blog: feeds Pinterest, email tools and readers, and is one more
// signal to crawlers that the section is alive.
const SITE = 'https://prayerbands.com'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function GET() {
  const posts = getAllPosts()
  const items = posts.map(p => `
    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
      <pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Prayer Bands Blog</title>
    <link>${SITE}/blog</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Practical help for praying for the people in your life.</description>
    <language>en-us</language>
    <lastBuildDate>${(posts[0] ? new Date(`${posts[0].date}T12:00:00Z`) : new Date()).toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
