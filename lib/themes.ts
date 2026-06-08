// Band experience color themes. Add a new theme by adding an entry here and
// selecting it in admin — no component changes needed.
//
// The band page maps its color constants to these CSS variables:
//   --primary (GOLD) · --accent (GREEN) · --deep (NAVY feature bg)
//   --text (DARK) · --background (CREAM page bg) · --muted (GRAY)
// The `default` theme intentionally matches the band page's existing palette,
// so an unthemed band looks exactly as it does today.

export interface Theme {
  label: string
  primary: string     // main brand / buttons / accents
  background: string  // page background
  surface: string     // card / panel background
  text: string        // primary text
  accent: string      // secondary accent
  deep: string        // dark feature background (e.g. verse card)
  muted: string       // secondary / muted text
}

export const themes: Record<string, Theme> = {
  default: {
    label: 'Default (Gold)',
    primary: '#B8860B',
    background: '#FAF6EF',
    surface: '#FFFFFF',
    text: '#2C1810',
    accent: '#1a4a3a',
    deep: '#1a2a4a',
    muted: '#7A6A5A',
  },
  beach: {
    label: 'Beach',
    primary: '#00A8CC',
    background: '#FFF9F0',
    surface: '#E8F4F8',
    text: '#1A4A5A',
    accent: '#F4A460',
    deep: '#0B5563',
    muted: '#6E8A93',
  },
  military: {
    label: 'Military',
    primary: '#4A5C3A',
    background: '#F2F0EB',
    surface: '#DDD9CC',
    text: '#1C2010',
    accent: '#8B7355',
    deep: '#2C3424',
    muted: '#6E6A5A',
  },
  christmas: {
    label: 'Christmas',
    primary: '#0F7A3D',
    background: '#FBF7F3',
    surface: '#F3E9E6',
    text: '#3A1212',
    accent: '#C0392B',
    deep: '#7A1620',
    muted: '#8A6A6A',
  },
  nature: {
    label: 'Nature',
    primary: '#5B8C3E',
    background: '#F7F8F2',
    surface: '#E8EFDD',
    text: '#23301A',
    accent: '#A9762F',
    deep: '#2E4422',
    muted: '#6E7A5E',
  },
  hope: {
    label: 'Hope',
    primary: '#7C5CBF',
    background: '#FBF8FE',
    surface: '#EFE8F8',
    text: '#2A1F3A',
    accent: '#E0A92E',
    deep: '#3A2A5A',
    muted: '#7A6E8A',
  },
}

export const DEFAULT_THEME = 'default'

export function getTheme(name?: string | null): Theme {
  return (name && themes[name]) || themes[DEFAULT_THEME]
}

// CSS custom properties for a theme, suitable for :root or an inline style.
export function themeVars(name?: string | null): Record<string, string> {
  const t = getTheme(name)
  return {
    '--primary': t.primary,
    '--background': t.background,
    '--surface': t.surface,
    '--text': t.text,
    '--accent': t.accent,
    '--deep': t.deep,
    '--muted': t.muted,
  }
}

// For admin dropdowns: [{ id: 'beach', label: 'Beach' }, ...]
export const THEME_OPTIONS = Object.entries(themes).map(([id, t]) => ({ id, label: t.label }))
