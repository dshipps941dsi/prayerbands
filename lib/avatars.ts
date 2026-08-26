// A small, curated set of profile avatars — faith and identity, expressive
// without image uploads. Stored as the emoji itself on profiles.avatar_icon;
// null falls back to initials. Keep the set tight and on-theme.
export const AVATAR_ICONS = [
  '✝️', '🕊️', '🙏', '🕯️', '📖', '⭐',
  '🌿', '❤️', '🐟', '👑', '🌻', '☀️',
  '🌙', '🌊', '🏔️', '⚓',
] as const

export type AvatarIcon = typeof AVATAR_ICONS[number]

export function isAvatarIcon(v: unknown): v is AvatarIcon {
  return typeof v === 'string' && (AVATAR_ICONS as readonly string[]).includes(v)
}

// Fonts offered for the initials fallback — all already loaded by the app, so
// no extra webfont cost. Keyed so profiles.avatar_font stays stable.
export const AVATAR_FONTS = [
  { key: 'serif',   label: 'Elegant', stack: "'Cormorant Garamond', Georgia, serif" },
  { key: 'display', label: 'Classic', stack: "'Playfair Display', Georgia, serif" },
  { key: 'carved',  label: 'Carved',  stack: "'Cinzel', Georgia, serif" },
  { key: 'modern',  label: 'Modern',  stack: "'Inter', system-ui, sans-serif" },
] as const

export function fontStack(key?: string | null): string {
  return AVATAR_FONTS.find(f => f.key === key)?.stack ?? AVATAR_FONTS[0].stack
}

// One initial by default; two ("first + last") when style is 'double' and a
// last name exists. Falls back to a cross when there is no name at all.
export function initialsFor(name?: string | null, style?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '✝'
  const first = parts[0][0].toUpperCase()
  if (style === 'double' && parts.length > 1) return first + parts[parts.length - 1][0].toUpperCase()
  return first
}
