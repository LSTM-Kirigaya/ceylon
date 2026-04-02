'use client'

import { ReactNode, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import { Menu as MenuIcon, Dashboard, VpnKey, Article, ArrowBack } from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Logo } from '@/components/Logo'
import type { Locale } from '@/i18n/config'

const drawerWidth = 260

export default function AdminShell({
  children,
  locale,
}: {
  children: ReactNode
  locale: Locale
}) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('admin')
  const { getEffectiveMode } = useThemeStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isDark = getEffectiveMode() === 'dark'

  const base = `/${locale}/admin`
  const nav = [
    { href: base, label: t('nav.overview'), icon: <Dashboard /> },
    { href: `${base}/invites`, label: t('nav.invites'), icon: <VpnKey /> },
    { href: `${base}/blog`, label: t('nav.blog'), icon: <Article /> },
  ]

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', pt: 2 }}>
      <Box sx={{ px: 2, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Logo height={28} />
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
          {t('title')}
        </Typography>
      </Box>
      <List sx={{ px: 1 }}>
        {nav.map((item) => {
          const active =
            item.href === base ? pathname === base : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <ListItemButton
              key={item.href}
              selected={active}
              onClick={() => {
                router.push(item.href)
                setMobileOpen(false)
              }}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ color: active ? CEYLON_ORANGE : undefined, minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          )
        })}
      </List>
      <Box sx={{ mt: 'auto', p: 2 }}>
        <ListItemButton
          onClick={() => {
            router.push(`/dashboard`)
            setMobileOpen(false)
          }}
          sx={{ borderRadius: 1.5, color: CEYLON_ORANGE }}
        >
          <ListItemIcon sx={{ color: CEYLON_ORANGE, minWidth: 40 }}>
            <ArrowBack />
          </ListItemIcon>
          <ListItemText primary={t('backToApp')} />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: isDark ? '#0a0a0a' : '#fafafa' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: isDark ? '#1c1917' : '#ffffff',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { md: 'none' }, color: isDark ? '#fff' : '#1c1917' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ color: isDark ? '#fff' : '#1c1917', fontWeight: 600 }}>
            {t('title')}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: isDark ? '#1c1917' : '#ffffff',
              borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: isDark ? '#1c1917' : '#ffffff',
              borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
