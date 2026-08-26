import type { MetadataRoute } from 'next'

// Web app manifest — makes the site installable ("Add to Home Screen") with a
// proper icon, name, and full-screen launch on Android and iPhone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Prayer Bands',
    short_name: 'Prayer Bands',
    description: "Carry His Word around the world. Tap your band for a daily verse and follow its journey.",
    // Launch straight into the band experience: /my-band resolves the signed-in
    // person's current band and redirects to it (or the dashboard / sign-in),
    // rather than opening the marketing home page.
    start_url: '/my-band',
    display: 'standalone',
    background_color: '#0A1628',
    theme_color: '#0A1628',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
