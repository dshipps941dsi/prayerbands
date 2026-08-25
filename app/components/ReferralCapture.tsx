'use client'
import { useEffect } from 'react'

// Capture a referral code from ?ref= on ANY page, not just the store, and
// remember it in the browser. A shared invite can land the visitor anywhere —
// the home page, a band page — so wherever they arrive, the code is saved once
// and then follows them through the site. The store reads the same
// 'pendingReferral' key at checkout, so nobody ever has to retype a code.
export default function ReferralCapture() {
  useEffect(() => {
    let raw: string | null = null
    try { raw = new URLSearchParams(window.location.search).get('ref') } catch {}
    if (!raw) return
    const code = raw.trim().toUpperCase()
    // Referral codes look like GIVE-XXXXXX; keep the guard loose but sane.
    if (!/^[A-Z0-9-]{4,20}$/.test(code)) return

    // Save it IMMEDIATELY — before the validation round-trip — so a quick click
    // through to the store can never read localStorage before it's written.
    // The store only needs the code (checkout re-derives the referrer server
    // side); validation below simply drops the code if it turns out bogus.
    try { localStorage.setItem('pendingReferral', JSON.stringify({ code })) } catch {}

    fetch('/api/referral/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(r => r.json())
      .then(d => {
        try {
          if (d?.valid) {
            localStorage.setItem('pendingReferral', JSON.stringify({ code, referrerUserId: d.referrerUserId }))
          } else {
            // A bogus code shouldn't leave a false discount banner standing.
            const cur = localStorage.getItem('pendingReferral')
            if (cur && JSON.parse(cur)?.code === code) localStorage.removeItem('pendingReferral')
          }
        } catch {}
      })
      .catch(() => {})
  }, [])
  return null
}
