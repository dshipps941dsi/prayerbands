import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'

// What we want crawled: the public pages and every blog post. Band pages,
// dashboards, sign-in and admin are deliberately left out — personal, thin,
// or both — and robots.ts keeps crawlers off them.
const SITE = 'https://prayerbands.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/store`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/how-it-works`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/subscribe`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/prayer-wall`, changeFrequency: 'daily', priority: 0.5 },
    { url: `${SITE}/prayer-circles`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE}/welcome`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE}/contact`, changeFrequency: 'yearly', priority: 0.3 },
  ]
  const posts: MetadataRoute.Sitemap = getAllPosts().map(p => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: new Date(`${p.updated || p.date}T12:00:00Z`),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))
  return [...pages, ...posts]
}
