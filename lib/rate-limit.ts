import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Best-effort identifier for the caller. x-forwarded-for is the client's IP
// chain on Vercel; we take the first hop. Falls back so a missing header never
// throws (it just buckets unknowns together).
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

// Returns true if the request is allowed, false if it exceeds the limit.
//
// FAIL-OPEN: if the rate_limit_buckets table / function isn't there yet (migration
// not run) or anything errors, we allow the request rather than break the feature.
// Rate limiting is a speed bump, not a gate — never let it take the app down.
export async function checkRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.warn('[rate-limit] check failed (allowing):', error.message)
      return true
    }
    return data !== false
  } catch (e) {
    console.warn('[rate-limit] error (allowing):', e)
    return true
  }
}
