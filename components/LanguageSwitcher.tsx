'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
} from '@mui/material'
import { Language } from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { CEYLON_ORANGE } from '@/stores/themeStore'

export function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const { getEffectiveMode } = useThemeStore()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'
  const menuOpen = Boolean(anchorEl)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLanguageSelect = (newLocale: Locale) => {
    if (!mounted) return
    // Replace the current locale in the pathname with the new one
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
    handleMenuClose()
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <>
      <IconButton
        onClick={handleMenuOpen}
        sx={{
          color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          '&:hover': { color: CEYLON_ORANGE },
        }}
        title={t('select')}
        aria-controls={menuOpen ? 'language-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={menuOpen ? 'true' : undefined}
      >
        <Language />
      </IconButton>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: isDark
              ? '0 4px 20px rgba(0,0,0,0.5)'
              : '0 4px 20px rgba(0,0,0,0.1)',
            minWidth: 140,
          },
        }}
      >
        {locales.map((loc) => (
          <MenuItem
            key={loc}
            onClick={() => handleLanguageSelect(loc)}
            selected={locale === loc}
            sx={{
              color: locale === loc ? CEYLON_ORANGE : isDark ? 'white' : '#1c1917',
              '&.Mui-selected': {
                backgroundColor: isDark ? 'rgba(194, 65, 12, 0.15)' : 'rgba(194, 65, 12, 0.08)',
              },
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <ListItemText 
              primary={localeNames[loc]} 
              sx={{ 
                '& .MuiListItemText-primary': { 
                  fontSize: '0.95rem',
                  fontWeight: locale === loc ? 600 : 400,
                } 
              }} 
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
