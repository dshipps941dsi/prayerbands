// The number on the app icon (Badging API). Two writers keep it honest:
//   - the page, whenever it learns the true unread count from the server
//     (open the app → badge matches the inbox; open the inbox → badge clears);
//   - the service worker, which bumps it by one per push while the app is
//     closed, using a counter it shares with the page through the Cache API.
// Works for installed apps on Android (Chrome) and iPhone (iOS 16.4+, Home
// Screen copy, once notifications are allowed). Everywhere else it's a no-op.

const CACHE = 'pb-badge'
const KEY = '/badge-count'

export async function syncAppBadge(n: number): Promise<void> {
  if (typeof navigator === 'undefined') return
  const count = Math.max(0, Math.floor(n || 0))
  try {
    const nav = navigator as any
    if (count > 0 && typeof nav.setAppBadge === 'function') await nav.setAppBadge(count)
    else if (count === 0 && typeof nav.clearAppBadge === 'function') await nav.clearAppBadge()
  } catch {}
  try {
    if ('caches' in window) {
      const c = await caches.open(CACHE)
      await c.put(KEY, new Response(String(count)))
    }
  } catch {}
}
