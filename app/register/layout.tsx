import type { Metadata } from 'next'

// Personal or operational — never something Google should list. robots.txt
// keeps crawlers out, but a linked page can still be indexed without this.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
