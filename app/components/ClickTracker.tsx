'use client'
import { useEffect } from 'react'
import { track } from '@/lib/analytics'

// Sends a GA4 `click` event for every click on an interactive element
// (links, buttons, role=button, submit/button inputs) with the element's
// text, href, and the current page path.
export default function ClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      const el = target?.closest(
        'a, button, [role="button"], input[type="submit"], input[type="button"]'
      ) as HTMLElement | null
      if (!el) return

      const text = (el.getAttribute('aria-label') || el.textContent || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 100)
      const href = el instanceof HTMLAnchorElement ? el.href : undefined

      track('click', {
        link_text: text || el.tagName.toLowerCase(),
        link_url: href,
        element: el.tagName.toLowerCase(),
        page_path: window.location.pathname,
      })
    }
    // Capture phase so we still record clicks that call stopPropagation.
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
