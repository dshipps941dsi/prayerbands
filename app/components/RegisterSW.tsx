'use client'
import { useEffect } from 'react'

// Registers the service worker so the app qualifies as installable. Silent on
// failure — a missing SW just means no "Add to Home Screen" prompt, never an error.
export default function RegisterSW() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
