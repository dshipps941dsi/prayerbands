'use client'
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallback() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function handleRedirect(userId: string) {
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f4ef', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 48, color: '#1a6b4a', marginBottom: 16 }}>✝</div>
        <div style={{ fontSize: 16, color: '#5a4f42' }}>Signing you in...</div>
      </div>
    </div>
  )
}
