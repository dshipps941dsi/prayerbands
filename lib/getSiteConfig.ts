import { createClient } from '@supabase/supabase-js'

// Server-side reader for the editable site_config table (pricing / shipping,
// stored as integer cents). Uses the service role key.
//
// This project has two env var names in use for the service key
// (SUPABASE_SERVICE_KEY in app routes, SUPABASE_SERVICE_ROLE_KEY in a few
// others), so we accept either. The client is created inside the function so
// env vars aren't read at module-eval time (which breaks the Vercel build).
export async function getSiteConfig(key: string): Promise<number> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) {
    throw new Error(`site_config: key "${key}" not found${error ? ` (${error.message})` : ''}`)
  }

  const num = Number(data.value)
  if (Number.isNaN(num)) {
    throw new Error(`site_config: value for "${key}" is not a number ("${data.value}")`)
  }

  return num
}
