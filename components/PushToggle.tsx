'use client'
import { useEffect, useState } from 'react'

// "Notify me on this phone" — turns Web Push on or off for this browser.
//
// Android: works in Chrome whether or not the app is installed. iPhone: only
// the copy on the Home Screen can receive pushes (Safari's rule), so when the
// page is running in a plain tab on iOS the switch is replaced with the one
// instruction that unlocks it. Permission is asked only when the person taps,
// never on load — a cold permission prompt is the fastest way to a "Block".

type State = 'checking' | 'unsupported' | 'ios-tab' | 'denied' | 'off' | 'on' | 'busy'

function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

const GOLD = '#C8A96E'
const DARK = '#15223B'
const GRAY = '#5C6573'

export default function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>('checking')
  const [msg, setMsg] = useState('')
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      const standalone = (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches
      setState(ios && !standalone ? 'ios-tab' : 'unsupported')
      return
    }
    if (Notification.permission === 'denied') { setState('denied'); return }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setState(sub && Notification.permission === 'granted' ? 'on' : 'off'))
      .catch(() => setState('off'))
  }, [publicKey])

  async function enable() {
    setState('busy'); setMsg('')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) })
      if (!res.ok) { await sub.unsubscribe().catch(() => {}); setState('off'); setMsg('Could not save this device. Try again.'); return }
      setState('on')
    } catch {
      setState('off'); setMsg('Could not turn notifications on here.')
    }
  }

  async function disable() {
    setState('busy'); setMsg('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {})
        await sub.unsubscribe().catch(() => {})
      }
      setState('off')
    } catch { setState('on') }
  }

  if (state === 'checking') return null

  const on = state === 'on'
  const busy = state === 'busy'
  const label = compact ? 'Notify me on this phone' : 'Push notifications on this device'
  const copy =
    state === 'ios-tab' ? 'On iPhone, notifications work once the app is on your Home Screen: tap Share, then “Add to Home Screen”, and open it from there.'
    : state === 'unsupported' ? 'This browser can’t receive notifications.'
    : state === 'denied' ? 'Notifications are blocked for this site in your phone’s settings. Allow them there, then come back.'
    : on ? 'You’ll get a nudge when someone prays for you, a gift band is claimed, or a partner request comes in.'
    : 'Get a nudge when someone prays for you, a gift band is claimed, or a partner request comes in. Nothing else.'

  const canToggle = state === 'on' || state === 'off' || busy

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: compact ? 15 : 16, fontWeight: 700, color: DARK }}>{label}</div>
        <div style={{ fontSize: 12.5, color: GRAY, lineHeight: 1.5, marginTop: 2 }}>{msg || copy}</div>
      </div>
      {canToggle && (
        <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={busy}
          onClick={on ? disable : enable}
          style={{ flexShrink: 0, width: 46, height: 26, borderRadius: 13, border: 'none', padding: 0, cursor: busy ? 'wait' : 'pointer', background: on ? GOLD : 'rgba(92,101,115,0.35)', position: 'relative', transition: 'background 0.2s', opacity: busy ? 0.6 : 1 }}>
          <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
        </button>
      )}
    </div>
  )
}
