import Script from 'next/script'

// Google Analytics 4. Uses the live Measurement ID by default; override with
// NEXT_PUBLIC_GA_ID (Vercel / .env.local) to point at a different property.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-YRMGDPW8JQ'

export default function GoogleAnalytics() {
  if (!GA_ID) return null
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
