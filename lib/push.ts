import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'

// Web Push to the devices a person has allowed notifications on. Best effort
// by design: a push is a nudge, never the record — the inbox item / email is
// the thing that must land, so nothing here throws, and a missing VAPID key
// simply means no pushes go out.
//
// Subscriptions that the push service reports gone (404/410) are deleted so
// the table does not fill with dead devices.

export type PushPayload = { title: string; body?: string; url?: string; tag?: string }

let configured = false
function configure(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@prayerbands.com', pub, priv)
    configured = true
  }
  return true
}

export function pushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

// `to` is one user id, a list of them, or 'everyone'.
export async function sendPush(to: string | string[] | 'everyone', payload: PushPayload): Promise<{ sent: number }> {
  try {
    if (!configure()) return { sent: 0 }
    const svc = createServiceClient()
    let q = svc.from('push_subscriptions').select('id, endpoint, p256dh, auth')
    if (to !== 'everyone') {
      const ids = [...new Set((Array.isArray(to) ? to : [to]).filter(Boolean))]
      if (!ids.length) return { sent: 0 }
      q = q.in('user_id', ids)
    }
    const { data: subs } = await q
    if (!subs?.length) return { sent: 0 }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body || '',
      url: payload.url || '/my-band',
      tag: payload.tag,
    })
    let sent = 0
    await Promise.all(subs.map(async s => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 * 24 }
        )
        sent++
        await svc.from('push_subscriptions').update({ last_used_at: new Date().toISOString(), failed_at: null }).eq('id', s.id)
      } catch (e: any) {
        const code = e?.statusCode
        if (code === 404 || code === 410) await svc.from('push_subscriptions').delete().eq('id', s.id)
        else await svc.from('push_subscriptions').update({ failed_at: new Date().toISOString() }).eq('id', s.id)
      }
    }))
    return { sent }
  } catch (e) {
    console.error('[push] send failed:', e)
    return { sent: 0 }
  }
}
