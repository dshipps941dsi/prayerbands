'use client'
import { useEffect } from 'react'
import { getTheme, themeToVars, loadThemes } from '@/lib/themes'

// Applies a band theme's CSS variables (--pb-*) to :root for the band experience.
// Restores the default palette on unmount so other pages are unaffected.
//
// Built-in themes apply instantly (no flash). Custom / admin-edited themes live
// in the DB, so we also hydrate via loadThemes() and re-apply once available.
export function useApplyTheme(themeName?: string | null) {
  useEffect(() => {
    const root = document.documentElement
    const apply = (name?: string | null) => {
      const vars = themeToVars(getTheme(name))
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
    }
    apply(themeName)
    let cancelled = false
    loadThemes().then(() => { if (!cancelled) apply(themeName) })
    return () => {
      cancelled = true
      const def = themeToVars(getTheme('default'))
      Object.entries(def).forEach(([k, v]) => root.style.setProperty(k, v))
    }
  }, [themeName])
}

// Wrapper form for pages with a single root: <ThemeProvider theme={band.theme}>…</ThemeProvider>
export default function ThemeProvider({
  theme,
  children,
}: {
  theme?: string | null
  children: React.ReactNode
}) {
  useApplyTheme(theme)
  return <>{children}</>
}
