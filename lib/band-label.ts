import { BUILTIN_THEMES } from '@/lib/themes'

export type BandStyle = {
  theme?: string | null
  color?: string | null
  size?: string | null
}

// Built-in theme names live in code; only overridden or custom themes reach the
// band_themes table. Callers that have loaded those rows pass them in, so a
// customised theme reads by its real name instead of its raw key.
export function themeLabelMap(rows?: { key: string; label: string }[] | null): Map<string, string> {
  const map = new Map<string, string>(
    Object.entries(BUILTIN_THEMES).map(([key, t]) => [key, (t as { label: string }).label])
  )
  for (const t of rows ?? []) map.set(t.key, t.label)
  return map
}

// What to call a band in front of a person: "Military", "Pink", "Beach".
//
// A themed band carries no colour and a plain band carries no distinctive
// theme, so whichever exists is the identifying feature. Returns null only when
// a band has neither, which should not happen outside test data.
export function bandLabel(b: BandStyle, labels?: Map<string, string>): string | null {
  const map = labels ?? themeLabelMap()
  const themeName = b.theme && b.theme !== 'default' ? (map.get(b.theme) ?? b.theme) : null
  return themeName ?? b.color ?? null
}

// The same, with size — "Military · L".
//
// This is what a customer needs when several bands arrive together: the band id
// alone cannot tell them which one is the pink and which is the military, so
// they cannot know which dedication belongs to whom.
export function bandDescription(b: BandStyle, labels?: Map<string, string>): string {
  const name = bandLabel(b, labels)
  if (name && b.size) return `${name} · ${b.size}`
  return name ?? (b.size ? `Size ${b.size}` : '')
}
