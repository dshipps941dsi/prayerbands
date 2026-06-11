'use client'
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

export default function AuthCallback() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function handleRedirect(userId: string) {
      // Return to an explicit ?next=… destination if one was provided
      // (e.g. a circle link the user signed in from).
      const next = new URLSearchParams(window.location.search).get('next')
      if (next && next.startsWith('/')) {
        window.location.href = next
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.org_id) {
        window.location.href = '/org/dashboard'
      } else {
        window.location.href = '/dashboard'
      }
    }

    // Listen for auth state change first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        subscription.unsubscribe()
        handleRedirect(session.user.id)
      }
    })

    // Also check existing session in case it's already set
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        subscription.unsubscribe()
        handleRedirect(data.session.user.id)
      }
    })

    // Timeout fallback
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      window.location.href = '/signin'
    }, 5000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F1E4', fontFamily: "'Inter', sans-serif", textAlign: 'center' }}>
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><PrayerBandsLogo size={48} color="#C8A96E" /></div>
        <div style={{ fontSize: 16, color: '#5C6573' }}>Signing you in...</div>
      </div>
    </div>
  )
}
