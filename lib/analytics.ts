// Lightweight GA4 event helper — safe to call anywhere on the client.
// No-ops on the server or before gtag has loaded.
type Params = Record<string, unknown>

export function track(event: string, params: Params = {}): void {
  if (typeof window === 'undefined') return
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (typeof gtag !== 'function') return
  gtag('event', event, params)
}
