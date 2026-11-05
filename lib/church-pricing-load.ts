import type { SupabaseClient } from '@supabase/supabase-js'
import { CHURCH_TIERS_KEY, readChurchTiers, type ChurchTier } from './church-pricing'

// Load the church tiers with a service-role client (site_config has no public
// read policy). A database error throws rather than falling back: charging the
// built-in prices because a read failed could charge a church the wrong amount.
export async function loadChurchTiers(svc: SupabaseClient): Promise<{ tiers: ChurchTier[]; saved: boolean }> {
  const { data, error } = await svc.from('site_config').select('value').eq('key', CHURCH_TIERS_KEY).maybeSingle()
  if (error) throw new Error('Could not load church pricing: ' + error.message)
  const value = (data as { value?: string } | null)?.value
  const read = readChurchTiers(value)
  if (read.corrupt) console.error('[church-pricing] the saved tiers did not parse; using the built-in prices. Re-save them in Admin > Pricing.')
  return { tiers: read.tiers, saved: !read.usedDefault }
}
