import Script from 'next/script'

// Google Analytics 4. Renders nothing unless NEXT_PUBLIC_GA_ID is set, so it's
// safe to deploy before the Measurement ID exists. Set NEXT_PUBLIC_GA_ID
// (e.g. "G-XXXXXXXXXX") in Vercel + .env.local to activate.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

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
