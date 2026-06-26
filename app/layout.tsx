import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CookieBanner from "./components/CookieBanner";
import GoogleAnalytics from "./components/GoogleAnalytics";
import ClickTracker from "./components/ClickTracker";

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
}
export const metadata: Metadata = {
  metadataBase: new URL("https://prayerbands.com"),
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
        {children}
        <CookieBanner />
        <GoogleAnalytics />
        <ClickTracker />
      </body>
    </html>
  );
}