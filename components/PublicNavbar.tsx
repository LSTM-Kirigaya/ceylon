'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  Avatar,
  Divider,
} from '@mui/material'
import {
  LightMode,
  DarkMode,
  Computer,
  Person,
  Settings,
  Logout,
} from '@mui/icons-material'
import { useThemeStore, CEYLON_ORANGE } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Logo } from '@/components/Logo'

type NavKey = 'docs' | 'blog' | 'pricing'

export function PublicNavbar({ locale }: { locale: string }) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const t = useTranslations()
  const { mode, setMode, getEffectiveMode } = useThemeStore()
  const { user, profile } = useAuthStore()

  const isDark = getEffectiveMode() === 'dark'

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const themeMenuOpen = Boolean(anchorEl)
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const userMenuOpen = Boolean(userMenuAnchor)

  const themeIcons = [
    { mode: 'light' as const, icon: <LightMode />, label: t('theme.light') },
    { mode: 'dark' as const, icon: <DarkMode />, label: t('theme.dark') },
    { mode: 'system' as const, icon: <Computer />, label: t('theme.system') },
  ]

  const currentThemeIcon = themeIcons.find((x) => x.mode === mode) || themeIcons[0]

  const navItems: Array<{ key: NavKey; href: string; label: string }> = [
    { key: 'docs', href: `/${locale}/docs`, label: t('nav.docs') },
    { key: 'blog', href: `/${locale}/blog`, label: t('nav.blog') },
    { key: 'pricing', href: `/${locale}/pricing`, label: t('nav.pricing') },
  ]

  const isActive = (key: NavKey) => {
    const base = `/${locale}/${key}`
    return pathname === base || pathname.startsWith(`${base}/`)
  }

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleThemeMenuClose = () => {
    setAnchorEl(null)
  }

  const handleThemeSelect = (themeMode: 'light' | 'dark' | 'system') => {
    setMode(themeMode)
    handleThemeMenuClose()
  }

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null)
  }

  const handleLogout = () => {
    handleUserMenuClose()
    window.location.href = `/${locale}/logout`
  }

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background: 'transparent',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Logo width={32} height={32} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: isDark ? 'white' : '#1c1917',
              fontSize: '1.25rem',
            }}
          >
            {t('common.appName')}
          </Typography>
        </Box>

        {/* Navigation Links - Center */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.key)
            return (
              <Button
                key={item.key}
                onClick={() => router.push(item.href)}
                sx={{
                  color: active
                    ? CEYLON_ORANGE
                    : isDark
                      ? 'rgba(255,255,255,0.7)'
                      : 'rgba(0,0,0,0.7)',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  px: 2,
                  py: 0.75,
                  borderRadius: 2,
                  backgroundColor: active
                    ? isDark
                      ? 'rgba(249, 115, 22, 0.12)'
                      : 'rgba(249, 115, 22, 0.10)'
                    : 'transparent',
                  '&:hover': {
                    color: active ? CEYLON_ORANGE : isDark ? 'white' : '#1c1917',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  },
                }}
              >
                {item.label}
              </Button>
            )
          })}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={handleThemeMenuOpen}
            sx={{
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              '&:hover': { color: CEYLON_ORANGE },
            }}
            title={t('theme.switch')}
          >
            {currentThemeIcon.icon}
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={themeMenuOpen}
            onClose={handleThemeMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                mt: 1,
              },
            }}
          >
            {themeIcons.map(({ mode: themeMode, icon, label }) => (
              <MenuItem
                key={themeMode}
                onClick={() => handleThemeSelect(themeMode)}
                selected={mode === themeMode}
                sx={{ color: mode === themeMode ? CEYLON_ORANGE : isDark ? 'white' : '#1c1917' }}
              >
                {icon}
                <ListItemText primary={label} sx={{ ml: 1 }} />
              </MenuItem>
            ))}
          </Menu>

          <LanguageSwitcher />

          {user ? (
            <>
              <Button
                variant="outlined"
                onClick={() => router.push(`/dashboard`)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  color: isDark ? 'white' : '#1c1917',
                  '&:hover': {
                    borderColor: CEYLON_ORANGE,
                    color: CEYLON_ORANGE,
                    backgroundColor: 'transparent',
                  },
                }}
              >
                {t('home.hero.dashboard')}
              </Button>
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{
                  ml: 1,
                  p: 0,
                  border: 'none',
                  '&:hover': { backgroundColor: 'transparent' },
                }}
              >
                <Avatar
                  data-testid="home-user-avatar"
                  src={profile?.avatar_url || undefined}
                  alt={profile?.display_name || user?.email}
                  sx={{
                    width: 36,
                    height: 36,
                    backgroundColor: CEYLON_ORANGE,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  {(profile?.display_name || user?.email || 'U').charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={userMenuAnchor}
                open={userMenuOpen}
                onClose={handleUserMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  sx: {
                    backgroundColor: isDark ? '#1c1917' : '#ffffff',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    mt: 1,
                    minWidth: 200,
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, color: isDark ? 'white' : '#1c1917' }}
                  >
                    {profile?.display_name || user?.email}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                  >
                    {user.email}
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                <MenuItem
                  onClick={() => {
                    handleUserMenuClose()
                    router.push(`/${locale}/profile`)
                  }}
                  sx={{ color: isDark ? 'white' : '#1c1917' }}
                >
                  <Person sx={{ mr: 1.5, fontSize: 20 }} />
                  <ListItemText primary={t('nav.profile')} />
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleUserMenuClose()
                    router.push(`/${locale}/settings`)
                  }}
                  sx={{ color: isDark ? 'white' : '#1c1917' }}
                >
                  <Settings sx={{ mr: 1.5, fontSize: 20 }} />
                  <ListItemText primary={t('common.settings')} />
                </MenuItem>
                <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                <MenuItem onClick={handleLogout} sx={{ color: '#ef4444' }}>
                  <Logout sx={{ mr: 1.5, fontSize: 20 }} />
                  <ListItemText primary={t('common.logout')} />
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button
                variant="text"
                onClick={() => router.push(`/${locale}/login`)}
                sx={{ color: isDark ? 'white' : '#1c1917', textTransform: 'none', fontWeight: 500 }}
              >
                {t('auth.login.submit')}
              </Button>
              <Button
                variant="contained"
                onClick={() => router.push(`/dashboard`)}
                sx={{ backgroundColor: CEYLON_ORANGE, textTransform: 'none', fontWeight: 600, px: 3, ml: 1 }}
              >
                {t('home.hero.dashboard')}
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}

