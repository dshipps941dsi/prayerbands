// How a person's name is shown on public surfaces: first name, last initial.
//
// Used by the prayer wall, the home page, and both maps. NOT used by a band's
// Prayer Chain — the people in a chain have physically held the same band and
// are shown to each other in full; the wall and the maps are open to anyone on
// the internet.
//
// "Sarea Frazier" → "Sarea F."   "Isla" → "Isla"   "" → fallback
export function publicName(name?: string | null, fallback = 'Anonymous'): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return fallback
  const last = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : ''
  return `${parts[0]}${last}`
}
