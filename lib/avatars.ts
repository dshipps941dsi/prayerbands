// A small, curated set of profile avatars — faith and identity, expressive
// without image uploads. Stored as the emoji itself on profiles.avatar_icon;
// null falls back to initials. Keep the set tight and on-theme.
export const AVATAR_ICONS = [
  '✝️', '🕊️', '🙏', '🔥', '🕯️', '📖',
  '⭐', '🌿', '❤️', '🐟', '👑', '🌻',
  '☀️', '🌙', '🌊', '🏔️', '🌈', '⚓',
] as const

export type AvatarIcon = typeof AVATAR_ICONS[number]

export function isAvatarIcon(v: unknown): v is AvatarIcon {
  return typeof v === 'string' && (AVATAR_ICONS as readonly string[]).includes(v)
}
