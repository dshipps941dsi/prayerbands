'use client'
import { useEffect } from 'react'
import { getTheme, themeToVars, loadThemes, resolveThemeKey } from '@/lib/themes'

// Applies a band theme's CSS variables (--pb-*) to :root for the band experience.
// Restores the default palette on unmount so other pages are unaffected.
//
// Built-in themes apply instantly (no flash). Custom / admin-edited themes live
// in the DB, so we also hydrate via loadThemes() and re-apply once available.
// `color` is the band's solid colour, for the plain bands that carry no artwork
// of their own. They are all stored as theme 'default', so without it a "Pink"
// theme created in the admin styles nothing. Resolution happens after
// loadThemes(), since those colour themes only exist in the DB.
export function useApplyTheme(themeName?: string | null, color?: string | null) {
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const vars = themeToVars(getTheme(resolveThemeKey(themeName, color)))
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
    }
    apply()
    let cancelled = false
    loadThemes().then(() => { if (!cancelled) apply() })
    return () => {
      cancelled = true
      const def = themeToVars(getTheme('default'))
      Object.entries(def).forEach(([k, v]) => root.style.setProperty(k, v))
    }
  }, [themeName, color])
}

// Wrapper form for pages with a single root: <ThemeProvider theme={band.theme}>…</ThemeProvider>
export default function ThemeProvider({
  theme,
  color,
  children,
}: {
  theme?: string | null
  color?: string | null
  children: React.ReactNode
}) {
  useApplyTheme(theme, color)
  return <>{children}</>
}
