'use client'

import { create } from 'zustand'
import { createTheme, Theme } from '@mui/material/styles'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  systemMode: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
  setSystemMode: (mode: 'light' | 'dark') => void
  getEffectiveMode: () => 'light' | 'dark'
}

// Ceylon Tea Orange color
const CEYLON_ORANGE = '#C85C1B'

const getLightTheme = (): Theme =>
  createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: CEYLON_ORANGE,
        light: '#E07B3A',
        dark: '#A34712',
        contrastText: '#fff',
      },
      secondary: {
        main: '#64748b',
        light: '#94a3b8',
        dark: '#475569',
      },
      background: {
        default: '#fafaf9',
        paper: '#ffffff',
      },

    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { letterSpacing: '-0.025em' },
      h2: { letterSpacing: '-0.025em' },
      h3: { letterSpacing: '-0.025em' },
      h4: { letterSpacing: '-0.025em' },
      h5: { letterSpacing: '-0.025em' },
      h6: { letterSpacing: '-0.025em' },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            '&:active': {
              transform: 'scale(0.98)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  })

const getDarkTheme = (): Theme =>
  createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: CEYLON_ORANGE,
        light: '#E07B3A',
        dark: '#A34712',
        contrastText: '#fff',
      },
      secondary: {
        main: '#94a3b8',
        light: '#cbd5e1',
        dark: '#64748b',
      },
      background: {
        default: '#0c0a09',
        paper: '#1c1917',
      },

    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { letterSpacing: '-0.025em' },
      h2: { letterSpacing: '-0.025em' },
      h3: { letterSpacing: '-0.025em' },
      h4: { letterSpacing: '-0.025em' },
      h5: { letterSpacing: '-0.025em' },
      h6: { letterSpacing: '-0.025em' },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            '&:active': {
              transform: 'scale(0.98)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            backgroundColor: '#1c1917',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: '#1c1917',
          },
        },
      },
    },
  })

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  systemMode: 'dark',
  setMode: (mode) => set({ mode }),
  setSystemMode: (systemMode) => set({ systemMode }),
  getEffectiveMode: () => {
    const { mode, systemMode } = get()
    if (mode === 'system') return systemMode
    return mode
  },
}))

export { getLightTheme, getDarkTheme, CEYLON_ORANGE }
