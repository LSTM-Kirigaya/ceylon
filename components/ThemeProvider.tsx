'use client'

import { useEffect, useState, ReactNode } from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { useThemeStore, getLightTheme, getDarkTheme } from '@/stores/themeStore'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { mode, setSystemMode, getEffectiveMode } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Set initial system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemMode(mediaQuery.matches ? 'dark' : 'light')

    // Listen for system theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemMode(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [setSystemMode])

  // Load saved theme preference from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as 'light' | 'dark' | 'system' | null
    if (savedMode) {
      useThemeStore.getState().setMode(savedMode)
    }
  }, [])

  // Save theme preference to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme-mode', mode)
    }
  }, [mode, mounted])

  const effectiveMode = getEffectiveMode()
  const theme = effectiveMode === 'dark' ? getDarkTheme() : getLightTheme()

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <MuiThemeProvider theme={getDarkTheme()}>
        <CssBaseline />
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </MuiThemeProvider>
    )
  }

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}
