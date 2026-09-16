import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CookieBanner from "./components/CookieBanner";
import GoogleAnalytics from "./components/GoogleAnalytics";
import ClickTracker from "./components/ClickTracker";
import ReferralCapture from "./components/ReferralCapture";
import RegisterSW from "./components/RegisterSW";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import type { Viewport } from "next";
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A1628',
}
export const metadata: Metadata = {
  metadataBase: new URL("https://prayerbands.com"),
  // Every page names itself as its own canonical (path only — ?ref= and
  // other query variants resolve to the plain address), unless it sets one.
  alternates: { canonical: "./" },
  title: "Prayer Bands — Carry His Word Around the World",
  description: "A global prayer movement. Every band carries a prayer. Track your band's journey, leave prayers, and watch intercession travel the world.",
  openGraph: {
    type: "website",
    siteName: "Prayer Bands",
    url: "https://prayerbands.com",
    title: "Prayer Bands — Carry His Word Around the World",
    description: "A global prayer movement. Every band carries a prayer. Track your band's journey, leave prayers, and watch intercession travel the world.",
    images: [{ url: "/home/og.jpg", width: 1200, height: 630, alt: "Prayer Bands — One Tap. Endless Prayers. Countless Lives Touched." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prayer Bands — Carry His Word Around the World",
    description: "A global prayer movement. Every band carries a prayer.",
    images: ["/home/og.jpg"],
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Prayer Bands",
    statusBarStyle: "black-translucent",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* The three faces nearly every screen paints first; the rest load on use.
            React hoists these into <head> once (a literal <head> rendered them twice). */}
        <link rel="preload" href="/fonts/cormorant-garamond-400-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/cinzel-600-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/inter-400-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {children}
        <CookieBanner />
        <GoogleAnalytics />
        <ClickTracker />
        <ReferralCapture />
        <RegisterSW />
      </body>
    </html>
  );
}