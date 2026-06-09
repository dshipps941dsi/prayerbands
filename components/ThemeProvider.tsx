'use client'
import { useEffect } from 'react'
import { getTheme, themeToVars } from '@/lib/themes'

// Applies a band theme's CSS variables (--pb-*) to :root for the band experience.
// Restores the default palette on unmount so other pages are unaffected.
export function useApplyTheme(themeName?: string | null) {
  useEffect(() => {
    const root = document.documentElement
    const vars = themeToVars(getTheme(themeName))
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
    return () => {
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
