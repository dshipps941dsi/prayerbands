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
  title: "Prayer Bands — Carry His Word Around the World",
  description: "A global prayer movement. Every band carries a prayer. Track your band's journey, leave prayers, and watch intercession travel the world.",
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