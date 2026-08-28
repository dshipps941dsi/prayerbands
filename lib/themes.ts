// ============================================================
// Prayer Bands — Theme System
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
  | 'military'
  | 'breast-cancer'
  | 'baseball'
  | 'golf'
  | 'volleyball';

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

  // --- Optional: opacity (0–1) of the theme-color wash laid over backgroundImage.
  // Lower = image shows through more (bolder). Defaults to 0.82 (subtle/readable). ---
  backgroundImageWash?: number;

  // --- Optional: default verse shown on first tap ---
  defaultVerse?: {
    text: string;
    reference: string;
  };
}

// ============================================================
// Theme definitions
// ============================================================

// Built-in themes shipped in code. Always available, even if the DB table is
// empty or unreachable. Admin-created / overridden themes are merged on top at
// runtime via loadThemes() (see bottom of file).
export const BUILTIN_THEMES: Record<ThemeKey, BandTheme> = {

  // ----------------------------------------------------------
  // DEFAULT  —  Parchment / Gold  (original Prayer Bands look)
  // ----------------------------------------------------------
  default: {
    label: 'Classic',

    primary:       '#C8A96E',  // gold
    background:    '#FDFAF5',  // parchment
    surface:       '#FFFFFF',  // white
    surfaceAlt:    '#F5EFE4',  // warm parchment tint

    text:          '#15223B',  // navy — also the full-page background on the claim screen
    textMuted:     '#5A6A85',  // blue-grey
    textOnPrimary: '#0F0D09',  // dark text — the default primary is light gold

    accent:        '#C8A96E',  // gold
    accentAlt:     '#7BAE8E',  // sage green

    tabBar:        '#15223B',  // navy — verse card, tab bar, dark gradients
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
    backgroundImageWash: 0.58,  // lighter wash — image-forward

    defaultVerse: {
      text:      'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
      reference: 'Joshua 1:9',
    },
  },

  // ----------------------------------------------------------
  // BREAST CANCER AWARENESS  —  Ribbon Pink / Plum / Rose
  // ----------------------------------------------------------
  'breast-cancer': {
    label: 'Breast Cancer Awareness',

    primary:       '#D6457F',  // ribbon pink
    background:    '#FDEEF4',  // soft blush
    surface:       '#FFFFFF',  // white
    surfaceAlt:    '#F8D7E5',  // light petal

    text:          '#3A1226',  // deep plum
    textMuted:     '#9C5C79',  // muted rose
    textOnPrimary: '#FFFFFF',  // white on pink buttons

    accent:        '#E5639E',  // bright rose
    accentAlt:     '#7A2E52',  // dark plum

    tabBar:        '#3A1226',  // deep plum
    tabActive:     '#E5639E',  // bright rose

    border:        '#F2C9DC',  // soft pink border

    cardAccent:    '#D6457F',  // ribbon pink left-border

    backgroundImage: '/themes/breast-cancer.jpg',

    defaultVerse: {
      text:      'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.',
      reference: 'Isaiah 41:10',
    },
  },

  // ----------------------------------------------------------
  // BASEBALL  —  Classic Navy / Stitch Red / Leather Cream
  // ----------------------------------------------------------
  baseball: {
    label: 'Baseball',

    primary:       '#13315C',  // classic navy
    background:    '#F6F3EA',  // leather cream
    surface:       '#FFFFFF',  // white
    surfaceAlt:    '#E7E0CE',  // worn leather

    text:          '#14213D',  // dark navy
    textMuted:     '#5A6B85',  // dugout blue-grey
    textOnPrimary: '#FFFFFF',  // white on dark buttons

    accent:        '#C0392B',  // stitch red
    accentAlt:     '#2E6B3E',  // outfield green

    tabBar:        '#14213D',  // dark navy
    tabActive:     '#C0392B',  // stitch red

    border:        '#D8CFB8',  // cream border

    cardAccent:    '#C0392B',  // stitch red left-border

    backgroundImage: '/themes/baseball.jpg',

    defaultVerse: {
      text:      'Therefore, since we are surrounded by such a great cloud of witnesses, let us throw off everything that hinders and run with perseverance the race marked out for us.',
      reference: 'Hebrews 12:1',
    },
  },

  // ----------------------------------------------------------
  // GOLF  —  Fairway Green / Bunker Sand / Sky Blue
  // ----------------------------------------------------------
  golf: {
    label: 'Golf',

    primary:       '#2C6E49',  // fairway green
    background:    '#EEF5EC',  // morning fairway
    surface:       '#FFFFFF',  // white
    surfaceAlt:    '#D8E9D4',  // light green

    text:          '#14271A',  // deep green
    textMuted:     '#5E7A60',  // muted green
    textOnPrimary: '#FFFFFF',  // white on green buttons

    accent:        '#D4A94C',  // bunker sand gold
    accentAlt:     '#5B9BD5',  // sky blue

    tabBar:        '#14271A',  // deep green
    tabActive:     '#D4A94C',  // bunker sand gold

    border:        '#C4DBC0',  // soft green border

    cardAccent:    '#2C6E49',  // fairway green left-border

    backgroundImage: '/themes/golf.jpg',

    defaultVerse: {
      text:      'I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.',
      reference: 'Philippians 3:14',
    },
  },

  // ----------------------------------------------------------
  // VOLLEYBALL  —  Court Blue / Sand Gold / Deep Navy
  // ----------------------------------------------------------
  volleyball: {
    label: 'Volleyball',

    primary:       '#2A6FB0',  // court blue
    background:    '#EAF3FB',  // sea breeze
    surface:       '#FFFFFF',  // white
    surfaceAlt:    '#D2E6F6',  // light court

    text:          '#0E2A47',  // deep navy
    textMuted:     '#4E7398',  // muted blue
    textOnPrimary: '#FFFFFF',  // white on blue buttons

    accent:        '#E0A23C',  // sand gold
    accentAlt:     '#16314E',  // deep navy

    tabBar:        '#0E2A47',  // deep navy
    tabActive:     '#E0A23C',  // sand gold

    border:        '#BBD8EF',  // soft blue border

    cardAccent:    '#2A6FB0',  // court blue left-border

    backgroundImage: '/themes/volleyball.jpg',

    defaultVerse: {
      text:      'Two are better than one, because they have a good return for their labor: If either of them falls down, one can help the other up.',
      reference: 'Ecclesiastes 4:9–10',
    },
  },

};

// ============================================================
// Runtime registry — built-ins, with DB themes merged on top
// once loadThemes() has run (client-side). getTheme() reads this
// so custom/overridden themes resolve everywhere getTheme is used.
// ============================================================
let REGISTRY: Record<string, BandTheme> = { ...BUILTIN_THEMES };
let hydrated = false;
let inflight: Promise<Record<string, BandTheme>> | null = null;

// Merge a set of themes (from the DB) over the built-ins. DB wins on key clash.
export function mergeThemes(extra: Record<string, BandTheme>) {
  REGISTRY = { ...BUILTIN_THEMES, ...extra };
}

// Fetch DB themes once and merge into the registry. Safe to call repeatedly;
// only the first call hits the network. Falls back silently to built-ins.
export async function loadThemes(): Promise<Record<string, BandTheme>> {
  if (hydrated) return REGISTRY;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/themes');
      if (res.ok) {
        const json = await res.json();
        if (json?.themes) mergeThemes(json.themes as Record<string, BandTheme>);
      }
    } catch {
      /* offline / error — keep built-ins */
    }
    hydrated = true;
    inflight = null;
    return REGISTRY;
  })();
  return inflight;
}

// ============================================================
// Helper — resolves a theme safely, falls back to default
// ============================================================
export function getTheme(key?: string | null): BandTheme {
  if (key && REGISTRY[key]) return REGISTRY[key];
  return REGISTRY.default ?? BUILTIN_THEMES.default;
}

// Which theme should a band actually wear?
//
// The batch generator models a band as EITHER artwork (theme: 'vhs') OR a solid
// colour (theme: 'default', color: 'Pink'). So a themed band names its theme
// directly, while every colour band in the box says 'default' — which means a
// "Pink" theme created in the admin lands on nothing at all, however carefully
// it was designed. Fifty pink bands, fifty black, fifty teal, all still wearing
// Classic parchment.
//
// So fall back to the colour: 'Light Grey' → 'light-grey'. A colour only styles
// a band if a theme with that key exists, so an unstyled colour still gets
// Classic rather than nothing.
// The engraved colour and the theme key do not always agree. The bands say
// "Light Grey"; the store product and the theme are both called Gray. Same
// mismatch the store had to encode in PRODUCT_VARIANTS, and it fails the same
// way — silently, with the theme styling nothing and no error anywhere.
const COLOR_THEME_ALIASES: Record<string, string> = {
  'light-grey': 'gray',
  'light-gray': 'gray',
  grey: 'gray',
};

export function themeKeyForColor(color?: string | null): string | null {
  const slug = (color || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!slug) return null;
  if (REGISTRY[slug]) return slug;
  const alias = COLOR_THEME_ALIASES[slug];
  return alias && REGISTRY[alias] ? alias : null;
}

export function resolveThemeKey(theme?: string | null, color?: string | null): string | null {
  // A theme that names itself and exists always wins; the colour is only ever a
  // fallback for the plain bands that have no artwork of their own.
  if (theme && theme !== 'default' && REGISTRY[theme]) return theme;
  return themeKeyForColor(color) ?? theme ?? null;
}

// Current dropdown options from the live registry (built-ins + any loaded DB themes).
export function getThemeOptions(): { id: string; label: string }[] {
  return Object.keys(REGISTRY).map((id) => ({ id, label: REGISTRY[id].label }));
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
  const wash = hexToRgba(theme.background, theme.backgroundImageWash ?? 0.82);
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
    // Logo: mark + the two words, each themeable. Fall back so existing themes
    // (which have none of these) still render a sensible lockup.
    '--pb-logo-mark':        (theme as any).logoMark   ?? theme.tabBar,
    '--pb-logo-prayer':      (theme as any).logoPrayer ?? theme.text,
    '--pb-logo-bands':       (theme as any).logoBands  ?? theme.primary,
  };
}

// ============================================================
// For admin dropdowns: [{ id: 'beach', label: 'Beach' }, ...]
// Static built-in list (SSR-safe fallback). For the live list including
// admin-created themes, use getThemeOptions() after loadThemes().
// ============================================================
export const THEME_OPTIONS = (Object.keys(BUILTIN_THEMES) as ThemeKey[]).map((id) => ({
  id,
  label: BUILTIN_THEMES[id].label,
}));

export const BUILTIN_THEME_KEYS = Object.keys(BUILTIN_THEMES);

// ============================================================
// Color helpers + auto-derivation
// The admin "simple" editor collects four key colors; we derive the rest.
// ============================================================
function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }

function parseHex(hex: string): [number, number, number] {
  const h = (hex || '').replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Linear blend of two hex colors. t=0 → a, t=1 → b.
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// Perceived luminance (0 dark – 1 light).
function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// White or near-black, whichever reads better on the given background.
export function idealTextOn(hex: string): string {
  return luminance(hex) > 0.6 ? '#0F0D09' : '#FFFFFF';
}

export interface SimpleThemeInput {
  label: string;
  primary: string;
  background: string;
  accent: string;
  text: string;
  verseText?: string;
  verseReference?: string;
  backgroundImage?: string;
  backgroundImageWash?: number;
}

// Build a full BandTheme from the four key colors, deriving the remaining
// palette with sensible tints/contrasts. The admin "Advanced" panel can then
// override any individual field on top of this.
export function deriveTheme(input: SimpleThemeInput): BandTheme {
  const { primary, background, accent, text } = input;
  const theme: BandTheme = {
    label: input.label,
    primary,
    background,
    surface: '#FFFFFF',
    surfaceAlt: mix(background, primary, 0.14),
    text,
    textMuted: mix(text, background, 0.45),
    textOnPrimary: idealTextOn(primary),
    accent,
    accentAlt: mix(primary, '#000000', 0.25),
    tabBar: text,
    tabActive: accent,
    border: mix(background, text, 0.18),
    cardAccent: primary,
  };
  if (input.verseText && input.verseReference) {
    theme.defaultVerse = { text: input.verseText, reference: input.verseReference };
  }
  if (input.backgroundImage) theme.backgroundImage = input.backgroundImage;
  if (input.backgroundImageWash !== undefined) theme.backgroundImageWash = input.backgroundImageWash;
  return theme;
}
