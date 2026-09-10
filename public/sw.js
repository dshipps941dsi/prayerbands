// Service worker. Two jobs: make the app installable (browsers require a
// registered SW with a fetch handler), and show push notifications. It
// intentionally does NOT cache aggressively — the app's content is dynamic
// and personal, so everything passes through to the network.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => { /* pass through to the network */ })

// A push arrives as JSON { title, body, url, tag } from lib/push.ts.
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data ? event.data.text() : '' } }
  const title = data.title || 'Prayer Bands'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/my-band' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Tapping the notification brings the app forward on the right page: reuse an
// open window if there is one, otherwise open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || '/my-band', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url === target && 'focus' in c) return c.focus()
      }
      const win = list.find((c) => 'navigate' in c)
      if (win) return win.navigate(target).then((c) => (c && c.focus ? c.focus() : undefined))
      return self.clients.openWindow(target)
    })
  )
})
