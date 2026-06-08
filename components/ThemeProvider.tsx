'use client'
import { useEffect } from 'react'
import { themeVars } from '@/lib/themes'

// Applies a theme's CSS variables to :root for the band experience.
// Restores the default palette on unmount so other pages are unaffected.
export function useApplyTheme(themeName?: string | null) {
  useEffect(() => {
    const root = document.documentElement
    const vars = themeVars(themeName)
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
    return () => {
      const def = themeVars('default')
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
