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
    // Referral codes look like PB-XXXXX; keep the guard loose but sane.
    if (!/^[A-Z0-9-]{4,20}$/.test(code)) return

    fetch('/api/referral/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(r => r.json())
      .then(d => {
        if (d?.valid) {
          try {
            localStorage.setItem('pendingReferral', JSON.stringify({ code, referrerUserId: d.referrerUserId }))
          } catch {}
        }
      })
      .catch(() => {})
  }, [])
  return null
}
