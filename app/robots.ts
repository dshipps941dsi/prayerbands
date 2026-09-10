import type { MetadataRoute } from 'next'

// Crawl the public site; stay out of anything personal or operational.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/fulfill', '/api/', '/dashboard', '/settings', '/signin', '/my-band', '/band/', '/connect/', '/checkout', '/success'],
      },
    ],
    sitemap: 'https://prayerbands.com/sitemap.xml',
    host: 'https://prayerbands.com',
  }
}
