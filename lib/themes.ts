// ============================================================
// PrayerBands — Theme System
// /lib/themes.ts
//
// Each theme is derived from real band artwork.
// To add a new theme:
//   1. Add an entry to the `themes` object below
//   2. Add the theme key to the `ThemeKey` type
//   3. Assign via `bands.theme` column in Supabase
// ============================================================

export type ThemeKey =
  | 'default'
  | 'mountain'
  | 'beach'
  | 'military';

export interface BandTheme {
  /** Human-readable label shown in admin dropdown */
  label: string;

  // --- Core palette ---
  /** Primary interactive color (buttons, links, active states) */
  primary: string;
  /** Page / screen background */
  background: string;
  /** Card / surface background */
  surface: string;
  /** Alternate surface (info banners, chips, subtle fills) */
  surfaceAlt: string;

  // --- Typography ---
  /** Body text on light backgrounds */
  text: string;
  /** Muted / secondary text */
  textMuted: string;
  /** Text on primary-colored buttons and dark surfaces — always #FFFFFF or near-white */
  textOnPrimary: string;

  // --- Accents ---
  /** Gold / highlight accent (active tab indicator, decorative) */
  accent: string;
  /** Secondary accent (secondary buttons, journey CTA) */
  accentAlt: string;

  // --- Navigation ---
  /** Bottom tab bar background */
  tabBar: string;
  /** Active tab icon + label color */
  tabActive: string;

  // --- Borders ---
  /** Default border / divider color */
  border: string;

  // --- Optional: left-border accent on verse / quote cards ---
  cardAccent?: string;

  // --- Optional: full-screen background image (path under /public, e.g. /themes/beach.jpg).
  // Rendered subtly behind the content with a translucent wash for readability. ---
  backgroundImage?: string;

  // --- Optional: default verse shown on first tap ---
  defaultVerse?: {
    text: string;
    reference: string;
  };
}

// ============================================================
// Theme definitions
// ============================================================

export const themes: Record<ThemeKey, BandTheme> = {

  // ----------------------------------------------------------
  // DEFAULT  —  Parchment / Gold  (original PrayerBands look)
  // ----------------------------------------------------------
  default: {
    label: 'Classic',

    primary:       '#C8A96E',  // gold
    background:    '#FDFAF5',  // parchment
    surface:       '#FFFFFF',  // white
    surfaceAlt:    '#F5EFE4',  // warm parchment tint

    text:          '#2C1A0E',  // espresso
    textMuted:     '#7A5C3A',  // warm brown
    textOnPrimary: '#FFFFFF',  // white on gold/dark buttons

    accent:        '#C8A96E',  // gold
    accentAlt:     '#7BAE8E',  // sage green

    tabBar:        '#2C1A0E',  // espresso
    tabActive:     '#C8A96E',  // gold

    border:        '#E8DCC8',  // parchment border

    cardAccent:    '#C8A96E',  // gold left-border on verse cards

    defaultVerse: {
      text:      'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.',
      reference: 'Jeremiah 29:11',
    },
  },

  // ----------------------------------------------------------
  // MOUNTAIN  —  Deep Navy / Summit Gold / Pine Green
  // Colors extracted from the Mountain Series band artwork
  // ----------------------------------------------------------
  mountain: {
    label: 'Mountain',

    primary:       '#2A5298',  // mountain blue
    background:    '#EEF2F7',  // alpine mist
    surface:       '#FFFFFF',  // snow white
    surfaceAlt:    '#DCE6F2',  // light ridge

    text:          '#0D1F3C',  // deep navy
    textMuted:     '#5A7BA8',  // misty ridge
    textOnPrimary: '#FFFFFF',  // white on dark buttons

    accent:        '#D4A84B',  // summit gold
    accentAlt:     '#2D4A2D',  // pine forest

    tabBar:        '#0D1F3C',  // deep navy
    tabActive:     '#D4A84B',  // summit gold

    border:        '#C0D0E8',  // soft blue-grey

    cardAccent:    '#2A5298',  // mountain blue left-border

    backgroundImage: '/themes/mountain.jpg',

    defaultVerse: {
      text:      'I lift up my eyes to the mountains — where does my help come from? My help comes from the Lord, the Maker of heaven and earth.',
      reference: 'Psalm 121:1–2',
    },
  },

  // ----------------------------------------------------------
  // BEACH  —  Ocean Blue / Seafoam / Sand Gold / Palm Green
  // Colors extracted from the Beach Series band artwork
  // ----------------------------------------------------------
  beach: {
    label: 'Beach',

    primary:       '#1B8FAD',  // tide blue
    background:    '#E8F7FA',  // sea breeze
    surface:       '#FFFFFF',  // white cap
    surfaceAlt:    '#D0EFF7',  // shallow water

    text:          '#0A2F45',  // deep ocean text
    textMuted:     '#2A7A9A',  // mid-water
    textOnPrimary: '#FFFFFF',  // white on dark buttons

    accent:        '#D4A94C',  // sand gold
    accentAlt:     '#1A3A1A',  // palm green

    tabBar:        '#0A4B6E',  // deep ocean
    tabActive:     '#D4A94C',  // sand gold

    border:        '#A0D8EE',  // shoreline

    cardAccent:    '#1B8FAD',  // tide blue left-border

    backgroundImage: '/themes/beach.jpg',

    defaultVerse: {
      text:      'He stilled the storm to a whisper; the waves of the sea were hushed. They were glad when it grew calm, and he guided them to their desired haven.',
      reference: 'Psalm 107:29–30',
    },
  },

  // ----------------------------------------------------------
  // MILITARY  —  Olive Drab / Khaki / Brass Gold / OD Green
  // Placeholder — update colors once band artwork is provided
  // ----------------------------------------------------------
  military: {
    label: 'Military',

    primary:       '#4A5C3A',  // olive drab
    background:    '#F2F0EB',  // tan / khaki
    surface:       '#FFFFFF',  // white
    surfaceAlt:    '#DDD9CC',  // field grey

    text:          '#1C2010',  // dark olive
    textMuted:     '#6B6B50',  // muted olive
    textOnPrimary: '#FFFFFF',  // white on dark buttons

    accent:        '#B8972A',  // brass gold
    accentAlt:     '#3A4A2A',  // dark OD green

    tabBar:        '#1C2010',  // dark olive
    tabActive:     '#B8972A',  // brass gold

    border:        '#C8C4B0',  // field tan border

    cardAccent:    '#4A5C3A',  // olive drab left-border

    backgroundImage: '/themes/military.jpg',

    defaultVerse: {
      text:      'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
      reference: 'Joshua 1:9',
    },
  },

};

// ============================================================
// Helper — resolves a theme safely, falls back to default
// ============================================================
export function getTheme(key?: string | null): BandTheme {
  if (key && key in themes) {
    return themes[key as ThemeKey];
  }
  return themes.default;
}

// ============================================================
// Helper — CSS variable map for injection into :root or a
// wrapping element via style attribute / ThemeProvider
//
// Usage in ThemeProvider:
//   const vars = themeToVars(getTheme(band.theme))
//   <div style={vars as React.CSSProperties}>...</div>
// ============================================================
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Full-screen page background: a translucent wash of the theme background over
// the optional image (kept subtle so cards/text stay readable). Falls back to a
// solid background color when the theme has no image.
function pageBackground(theme: BandTheme): string {
  if (!theme.backgroundImage) return theme.background;
  const wash = hexToRgba(theme.background, 0.82);
  return `linear-gradient(${wash}, ${wash}), url("${theme.backgroundImage}") center / cover no-repeat, ${theme.background}`;
}

export function themeToVars(theme: BandTheme): Record<string, string> {
  return {
    '--pb-primary':          theme.primary,
    '--pb-background':       theme.background,
    '--pb-page':             pageBackground(theme),
    '--pb-surface':          theme.surface,
    '--pb-surface-alt':      theme.surfaceAlt,
    '--pb-text':             theme.text,
    '--pb-text-muted':       theme.textMuted,
    '--pb-text-on-primary':  theme.textOnPrimary,
    '--pb-accent':           theme.accent,
    '--pb-accent-alt':       theme.accentAlt,
    '--pb-tab-bar':          theme.tabBar,
    '--pb-tab-active':       theme.tabActive,
    '--pb-border':           theme.border,
    '--pb-card-accent':      theme.cardAccent ?? theme.primary,
  };
}

// ============================================================
// For admin dropdowns: [{ id: 'beach', label: 'Beach' }, ...]
// ============================================================
export const THEME_OPTIONS = (Object.keys(themes) as ThemeKey[]).map((id) => ({
  id,
  label: themes[id].label,
}));
