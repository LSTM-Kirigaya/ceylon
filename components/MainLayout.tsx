'use client'

import { ReactNode, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Folder,
  Settings,
  Logout,
  Search,
  Add,
  AccountCircle,
  Home,
  LightMode,
  DarkMode,
  Computer,
  Language,
  KeyboardCommandKey,
  CreditCard,
  ChevronRight,
} from '@mui/icons-material'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Logo } from './Logo'
import { CommandPalette } from './CommandPalette'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { apiJson } from '@/lib/client-api'

interface MainLayoutProps {
  children: ReactNode
}

const drawerWidth = 260
const collapsedDrawerWidth = 72

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale() as Locale
  const t = useTranslations()
  const { profile, signOut } = useAuthStore()
  const { mode, setMode, getEffectiveMode } = useThemeStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [mounted, setMounted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const searchParams = useSearchParams()
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [resolvedNames, setResolvedNames] = useState<{ projectName?: string; viewName?: string }>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keyboard shortcut to open command palette (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'
  const isDashboard = pathname === `/${locale}/dashboard`

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push(`/${locale}/login`)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    setMobileOpen(false)
  }

  const isPathActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const isSidebarExpanded = !sidebarCollapsed || sidebarHovered
  const currentSidebarWidth = isSidebarExpanded ? drawerWidth : collapsedDrawerWidth
  const pathSegments = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    // When pathname does not include the locale segment (e.g. some test flows / redirects),
    // avoid blindly dropping the first segment.
    return segments[0] === locale ? segments.slice(1) : segments
  }, [pathname, locale])

  const breadcrumbLabelMap: Record<string, string> = {
    dashboard: '控制台',
    project: '项目',
    settings: '设置',
    team: '团队成员',
    view: '版本视图',
    profile: '个人资料',
    subscription: '订阅套餐',
  }

  // Some segments (e.g. "project" / "view") are route groups without dedicated pages.
  // If we make them clickable, we might navigate to non-existent routes like:
  //   /dashboard/project  (missing projectId) => 404
  const breadcrumbs = pathSegments
    .map((segment, index) => {
      if (segment === 'project' || segment === 'view') return null

      const href = `/${locale}/${pathSegments.slice(0, index + 1).join('/')}`
      const isLast = index === pathSegments.length - 1
      const isUuidLike = segment.length > 20 && /^[0-9a-f-]+$/i.test(segment)
      let label = breadcrumbLabelMap[segment] || (isUuidLike ? segment.slice(0, 8) : segment)

      if (isUuidLike && index > 0 && pathSegments[index - 1] === 'project' && resolvedNames.projectName) {
        label = resolvedNames.projectName
      }
      if (isUuidLike && index > 0 && pathSegments[index - 1] === 'view' && resolvedNames.viewName) {
        label = resolvedNames.viewName
      }

      return { href, isLast, label }
    })
    .filter((x): x is { href: string; isLast: boolean; label: string } => x !== null)

  useEffect(() => {
    const loadNames = async () => {
      const projectIndex = pathSegments.findIndex((s) => s === 'project')
      const viewIndex = pathSegments.findIndex((s) => s === 'view')
      const projectId = projectIndex >= 0 ? pathSegments[projectIndex + 1] : undefined
      const viewId = viewIndex >= 0 ? pathSegments[viewIndex + 1] : undefined
      const hasProjectPage = projectId && /^[0-9a-f-]{36}$/i.test(projectId)
      const hasViewPage = viewId && /^[0-9a-f-]{36}$/i.test(viewId)
      if (!hasProjectPage && !hasViewPage) {
        setResolvedNames({})
        return
      }
      try {
        const [projectRes, viewRes] = await Promise.all([
          hasProjectPage
            ? apiJson<{ project: { name: string } }>(`/api/projects/${projectId}`)
            : Promise.resolve(null),
          hasViewPage && hasProjectPage
            ? apiJson<{ view: { name: string } }>(
                `/api/version-views/${viewId}?projectId=${encodeURIComponent(projectId as string)}`
              )
            : Promise.resolve(null),
        ])
        const next: { projectName?: string; viewName?: string } = {
          projectName: projectRes?.project?.name,
          viewName: viewRes?.view?.name,
        }
        setResolvedNames(next)
      } catch {
        // Keep fallback short IDs if request fails.
      }
    }
    loadNames()
  }, [pathname])

  useEffect(() => {
    const onRename = () => {
      setResolvedNames({})
      void (async () => {
        const projectIndex = pathSegments.findIndex((s) => s === 'project')
        const viewIndex = pathSegments.findIndex((s) => s === 'view')
        const projectId = projectIndex >= 0 ? pathSegments[projectIndex + 1] : undefined
        const viewId = viewIndex >= 0 ? pathSegments[viewIndex + 1] : undefined
        const hasProjectPage = projectId && /^[0-9a-f-]{36}$/i.test(projectId)
        const hasViewPage = viewId && /^[0-9a-f-]{36}$/i.test(viewId)
        if (!hasProjectPage && !hasViewPage) return
        try {
          const [projectRes, viewRes] = await Promise.all([
            hasProjectPage
              ? apiJson<{ project: { name: string } }>(`/api/projects/${projectId}`)
              : Promise.resolve(null),
            hasViewPage && hasProjectPage
              ? apiJson<{ view: { name: string } }>(
                  `/api/version-views/${viewId}?projectId=${encodeURIComponent(projectId as string)}`
                )
              : Promise.resolve(null),
          ])
          setResolvedNames({
            projectName: projectRes?.project?.name,
            viewName: viewRes?.view?.name,
          })
        } catch {
          /* keep previous */
        }
      })()
    }
    window.addEventListener('ceylon-view-renamed', onRename)
    return () => window.removeEventListener('ceylon-view-renamed', onRename)
  }, [pathSegments])

  // Theme options
  const themeIcons = [
    { mode: 'light' as const, icon: <LightMode fontSize="small" />, label: t('theme.light') },
    { mode: 'dark' as const, icon: <DarkMode fontSize="small" />, label: t('theme.dark') },
    { mode: 'system' as const, icon: <Computer fontSize="small" />, label: t('theme.system') },
  ]

  const handleThemeSelect = (themeMode: 'light' | 'dark' | 'system') => {
    setMode(themeMode)
  }

  // Language menu
  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setLangAnchorEl(event.currentTarget)
  }

  const handleLangMenuClose = () => {
    setLangAnchorEl(null)
  }

  const handleLanguageSelect = (newLocale: Locale) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
    handleLangMenuClose()
    handleProfileMenuClose()
  }

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden', width: '100%', minWidth: collapsedDrawerWidth }}>
      {/* New Project Button */}
      <Box sx={{ px: 2, py: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={isSidebarExpanded ? <Add /> : undefined}
          onClick={() => handleNavigation(`/${locale}/dashboard?create=1`)}
          sx={{
            backgroundColor: CEYLON_ORANGE,
            '&:hover': { backgroundColor: '#A34712' },
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
            minWidth: isSidebarExpanded ? 'auto' : 44,
            px: isSidebarExpanded ? 2 : 1,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {isSidebarExpanded ? '新建项目' : <Add />}
        </Button>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {/* 我的项目 */}
        <Box
          onClick={() => handleNavigation(`/${locale}/dashboard`)}
          sx={{
            mx: 1.5,
            mb: 0.5,
            px: isSidebarExpanded ? 2 : 1.5,
            py: 1,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            cursor: 'pointer',
            backgroundColor: pathname === `/${locale}/dashboard` && !pathname.includes('/subscription')
              ? isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
              : 'transparent',
            color: pathname === `/${locale}/dashboard` && !pathname.includes('/subscription')
              ? isDark ? '#ffffff' : '#1c1917'
              : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            '&:hover': {
              backgroundColor: pathname === `/${locale}/dashboard` && !pathname.includes('/subscription')
                ? isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
            justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <Folder sx={{ fontSize: 20 }} />
          {isSidebarExpanded && (
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
              我的项目
            </Typography>
          )}
        </Box>

        {/* 订阅套餐 */}
        <Box
          onClick={() => handleNavigation(`/${locale}/dashboard/subscription`)}
          sx={{
            mx: 1.5,
            mb: 0.5,
            px: isSidebarExpanded ? 2 : 1.5,
            py: 1,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            cursor: 'pointer',
            backgroundColor: pathname === `/${locale}/dashboard/subscription`
              ? isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
              : 'transparent',
            color: pathname === `/${locale}/dashboard/subscription`
              ? isDark ? '#ffffff' : '#1c1917'
              : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            '&:hover': {
              backgroundColor: pathname === `/${locale}/dashboard/subscription`
                ? isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
            justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <CreditCard sx={{ fontSize: 20 }} />
          {isSidebarExpanded && (
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
              订阅套餐
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )

  if (!mounted) {
    return null
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Top Navigation Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: '100%',
          background: isDark ? '#0c0a09' : '#ffffff',
          boxShadow: 'none',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: 48, px: 1.5, gap: 1.5 }}>
          {/* Left: Mobile Menu Button + Logo + Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' }, color: isDark ? 'white' : '#1c1917' }}
            >
              <MenuIcon />
            </IconButton>

            <IconButton
              onClick={() => handleNavigation(`/${locale}/dashboard`)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                p: 0,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Logo width={32} height={32} />
            </IconButton>
            
            <Typography
              variant="h6"
              className="select-none text-lg font-bold leading-none tracking-tight"
              sx={{
                color: isDark ? 'white' : '#1c1917',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ceylonm
            </Typography>
          </Box>

          {/* Global breadcrumb in top navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, ml: 1.5, flex: 1, minWidth: 0 }}>
            {breadcrumbs.length > 0 && (
              <Breadcrumbs
                separator={<ChevronRight sx={{ fontSize: 16, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} />}
                aria-label="breadcrumb"
                sx={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                {breadcrumbs.map((item) =>
                  item.isLast ? (
                    <Typography
                      key={item.href}
                      sx={{
                        color: isDark ? 'white' : '#1c1917',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                    >
                      {item.label}
                    </Typography>
                  ) : (
                    <MuiLink
                      key={item.href}
                      underline="hover"
                      onClick={() => handleNavigation(item.href)}
                      sx={{
                        cursor: 'pointer',
                        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                        fontSize: '0.875rem',
                      }}
                    >
                      {item.label}
                    </MuiLink>
                  )
                )}
              </Breadcrumbs>
            )}
          </Box>

          {/* Right: Search + Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Search Button - Styled like reference image */}
            <Button
              onClick={() => setCommandPaletteOpen(true)}
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                px: 2,
                py: 0.5,
                minWidth: 200,
                borderRadius: 10,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                textTransform: 'none',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Search sx={{ fontSize: 18, opacity: 0.7 }} />
                <Typography sx={{ 
                  fontSize: '0.9rem', 
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                }}>
                  搜索...
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.3,
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                fontFamily: 'monospace',
              }}>
                <KeyboardCommandKey sx={{ fontSize: 14 }} />
                <span>K</span>
              </Box>
            </Button>

            {/* Mobile Search Icon */}
            <IconButton
              onClick={() => setCommandPaletteOpen(true)}
              sx={{
                display: { sm: 'none' },
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              }}
            >
              <Search />
            </IconButton>

            {/* Avatar */}
            <Avatar
              src={profile?.avatar_url || undefined}
              onClick={handleProfileMenuOpen}
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
              {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ 
          width: { md: currentSidebarWidth }, 
          flexShrink: { md: 0 },
          display: { xs: 'none', md: 'block' },
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: isDark ? '#0d0d0d' : '#f5f5f4',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
        {/* Desktop Sidebar with hover effect */}
        <Box
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'fixed',
            left: 0,
            top: 48,
            height: 'calc(100% - 48px)',
            width: currentSidebarWidth,
            backgroundColor: isDark ? '#0d0d0d' : '#f5f5f4',
            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            overflowX: 'hidden',
            overflowY: 'auto',
            zIndex: 1200,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {sidebarContent}
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { md: `calc(100% - ${currentSidebarWidth}px)` },
          minHeight: '100vh',
          backgroundColor: isDark ? '#0a0a0a' : '#fafafa',
          pt: 6,
        }}
      >
        {children}
      </Box>

      {/* User Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: isDark 
              ? '0 4px 20px rgba(0,0,0,0.5)' 
              : '0 4px 20px rgba(0,0,0,0.1)',
            minWidth: 200,
            mt: 1,
          },
        }}
      >
        {/* User Info */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
          <Typography variant="subtitle2" sx={{ color: isDark ? 'white' : '#1c1917', fontWeight: 600 }}>
            {profile?.display_name || profile?.email?.split('@')[0]}
          </Typography>
          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
            {profile?.email}
          </Typography>
        </Box>
        
        <MenuItem 
          onClick={() => { router.push(`/${locale}/profile`); handleProfileMenuClose() }}
          sx={{
            py: 1.5,
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          <ListItemIcon sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', minWidth: 36 }}>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('nav.profile')} />
        </MenuItem>
        
        <MenuItem 
          onClick={() => { router.push(`/${locale}/settings`); handleProfileMenuClose() }}
          sx={{
            py: 1.5,
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          <ListItemIcon sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', minWidth: 36 }}>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('common.settings')} />
        </MenuItem>

        <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

        {/* Theme Selection */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t('theme.switch')}
          </Typography>
        </Box>
        {themeIcons.map(({ mode: themeMode, icon, label }) => (
          <MenuItem
            key={themeMode}
            onClick={() => handleThemeSelect(themeMode)}
            selected={mode === themeMode}
            sx={{
              py: 1,
              pl: 2,
              color: mode === themeMode ? CEYLON_ORANGE : isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
              '&.Mui-selected': {
                backgroundColor: isDark ? 'rgba(194, 65, 12, 0.15)' : 'rgba(194, 65, 12, 0.08)',
              },
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <ListItemIcon sx={{ color: mode === themeMode ? CEYLON_ORANGE : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', minWidth: 32 }}>
              {icon}
            </ListItemIcon>
            <ListItemText 
              primary={label} 
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </MenuItem>
        ))}

        <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

        {/* Language Selection */}
        <MenuItem 
          onClick={handleLangMenuOpen}
          sx={{
            py: 1.5,
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          <ListItemIcon sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', minWidth: 36 }}>
            <Language fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary={t('language.select')} 
            secondary={localeNames[locale]}
            secondaryTypographyProps={{ fontSize: '0.75rem' }}
          />
        </MenuItem>
        
        <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
        
        <MenuItem 
          onClick={handleSignOut}
          sx={{ 
            py: 1.5,
            color: '#ef4444',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
            },
          }}
        >
          <ListItemIcon sx={{ color: '#ef4444', minWidth: 36 }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('common.logout')} />
        </MenuItem>
      </Menu>

      {/* Command Palette */}
      <CommandPalette 
        open={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />

      {/* Language Submenu */}
      <Menu
        anchorEl={langAnchorEl}
        open={Boolean(langAnchorEl)}
        onClose={handleLangMenuClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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
    </Box>
  )
}
