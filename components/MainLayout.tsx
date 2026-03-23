'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  Tooltip,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  Folder,
  Settings,
  Logout,
  Search,
  Add,
  ChevronLeft,
  AccountCircle,
  Home,
} from '@mui/icons-material'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { LanguageSwitcher } from './LanguageSwitcher'

interface MainLayoutProps {
  children: ReactNode
}

const drawerWidth = 260
const collapsedDrawerWidth = 72

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations()
  const { profile, signOut } = useAuthStore()
  const { getEffectiveMode } = useThemeStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [mounted, setMounted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

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

  const currentSidebarWidth = sidebarCollapsed ? collapsedDrawerWidth : drawerWidth

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <IconButton
          onClick={() => handleNavigation(`/${locale}/dashboard`)}
          sx={{
            width: 36,
            height: 36,
            backgroundColor: CEYLON_ORANGE,
            borderRadius: 1.5,
            '&:hover': {
              backgroundColor: '#A34712',
            },
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
            C
          </Typography>
        </IconButton>
        {!sidebarCollapsed && (
          <Typography 
            sx={{ 
              color: isDark ? 'white' : '#1c1917', 
              fontWeight: 600,
              fontSize: '1rem',
              flex: 1,
            }}
          >
            Ceylon
          </Typography>
        )}
        {!sidebarCollapsed && (
          <Tooltip title="收起侧边栏">
            <IconButton 
              size="small" 
              onClick={() => setSidebarCollapsed(true)}
              sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
            >
              <ChevronLeft fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Search Projects - only when expanded */}
      {!sidebarCollapsed && (
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="搜索项目..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                fontSize: '0.875rem',
              },
            }}
          />
        </Box>
      )}

      {/* New Project Button */}
      <Box sx={{ px: 2, py: 1 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleNavigation(`/${locale}/dashboard`)}
          sx={{
            backgroundColor: CEYLON_ORANGE,
            '&:hover': { backgroundColor: '#A34712' },
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            minWidth: sidebarCollapsed ? 44 : 'auto',
            px: sidebarCollapsed ? 1 : 2,
          }}
        >
          {sidebarCollapsed ? <Add /> : '新建项目'}
        </Button>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {/* Home */}
        <Tooltip title="首页" placement="right" disableHoverListener={!sidebarCollapsed}>
          <Box
            onClick={() => handleNavigation(`/${locale}/dashboard`)}
            sx={{
              mx: 1.5,
              mb: 0.5,
              px: sidebarCollapsed ? 1.5 : 2,
              py: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              backgroundColor: isPathActive(`/${locale}/dashboard`) && !pathname.includes('/project/')
                ? isDark ? 'rgba(200, 92, 27, 0.15)' : 'rgba(200, 92, 27, 0.08)'
                : 'transparent',
              color: isPathActive(`/${locale}/dashboard`) && !pathname.includes('/project/')
                ? CEYLON_ORANGE
                : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
              '&:hover': {
                backgroundColor: isPathActive(`/${locale}/dashboard`) && !pathname.includes('/project/')
                  ? isDark ? 'rgba(200, 92, 27, 0.2)' : 'rgba(200, 92, 27, 0.12)'
                  : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              },
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
          >
            <Home sx={{ fontSize: 20 }} />
            {!sidebarCollapsed && (
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                首页
              </Typography>
            )}
          </Box>
        </Tooltip>

        {/* Projects Section */}
        {!sidebarCollapsed && (
          <Typography 
            variant="caption" 
            sx={{ 
              px: 2, 
              py: 1.5, 
              display: 'block',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            项目
          </Typography>
        )}
        
        <Tooltip title="所有项目" placement="right" disableHoverListener={!sidebarCollapsed}>
          <Box
            onClick={() => handleNavigation(`/${locale}/dashboard`)}
            sx={{
              mx: 1.5,
              mb: 0.5,
              px: sidebarCollapsed ? 1.5 : 2,
              py: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              backgroundColor: pathname === `/${locale}/dashboard`
                ? isDark ? 'rgba(200, 92, 27, 0.15)' : 'rgba(200, 92, 27, 0.08)'
                : 'transparent',
              color: pathname === `/${locale}/dashboard`
                ? CEYLON_ORANGE
                : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
              '&:hover': {
                backgroundColor: pathname === `/${locale}/dashboard`
                  ? isDark ? 'rgba(200, 92, 27, 0.2)' : 'rgba(200, 92, 27, 0.12)'
                  : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              },
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
          >
            <Folder sx={{ fontSize: 20 }} />
            {!sidebarCollapsed && (
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                所有项目
              </Typography>
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Sidebar Footer - User */}
      <Box sx={{ 
        p: 2, 
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <Tooltip title={profile?.display_name || profile?.email} placement="right" disableHoverListener={!sidebarCollapsed}>
          <Box
            onClick={handleProfileMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              p: 0.5,
              borderRadius: 2,
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              },
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
          >
            <Avatar
              src={profile?.avatar_url || undefined}
              sx={{
                width: 32,
                height: 32,
                backgroundColor: CEYLON_ORANGE,
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            {!sidebarCollapsed && (
              <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <Typography 
                  noWrap 
                  sx={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 600,
                    color: isDark ? 'white' : '#1c1917',
                  }}
                >
                  {profile?.display_name || profile?.email?.split('@')[0]}
                </Typography>
                <Typography 
                  noWrap 
                  sx={{ 
                    fontSize: '0.75rem', 
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  }}
                >
                  {profile?.email}
                </Typography>
              </Box>
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Expand button when collapsed */}
      {sidebarCollapsed && (
        <Tooltip title="展开侧边栏" placement="right">
          <IconButton
            size="small"
            onClick={() => setSidebarCollapsed(false)}
            sx={{
              position: 'absolute',
              right: -12,
              top: 24,
              width: 24,
              height: 24,
              backgroundColor: isDark ? '#1c1917' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              },
            }}
          >
            <MenuIcon sx={{ fontSize: 14, transform: 'rotate(180deg)' }} />
          </IconButton>
        </Tooltip>
      )}
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
          backgroundColor: isDark ? '#0c0a09' : '#fafaf9',
          boxShadow: 'none',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: 56, px: 2, gap: 2 }}>
          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { md: 'none' }, color: isDark ? 'white' : '#1c1917' }}
          >
            <MenuIcon />
          </IconButton>

          {/* Breadcrumb or Page Title */}
          <Typography 
            variant="h6" 
            sx={{ 
              flex: 1, 
              color: isDark ? 'white' : '#1c1917',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {pathname.includes('/dashboard/project/') ? '项目详情' : 
             pathname.includes('/profile') ? '个人资料' :
             pathname.includes('/settings') ? '设置' :
             'Dashboard'}
          </Typography>

          {/* Right Side Tools */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LanguageSwitcher />
            
            <Tooltip title="设置">
              <IconButton
                onClick={() => handleNavigation(`/${locale}/settings`)}
                sx={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  '&:hover': {
                    color: CEYLON_ORANGE,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  },
                }}
              >
                <Settings />
              </IconButton>
            </Tooltip>

            <Tooltip title="个人资料">
              <IconButton
                onClick={() => handleNavigation(`/${locale}/profile`)}
                sx={{
                  p: 0.5,
                  border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: CEYLON_ORANGE,
                  },
                }}
              >
                <Avatar
                  src={profile?.avatar_url || undefined}
                  sx={{
                    width: 28,
                    height: 28,
                    backgroundColor: CEYLON_ORANGE,
                    fontSize: '0.75rem',
                  }}
                >
                  {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
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
              backgroundColor: isDark ? '#0c0a09' : '#fafaf9',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentSidebarWidth,
              backgroundColor: isDark ? '#0c0a09' : '#fafaf9',
              borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              top: 56,
              height: 'calc(100% - 56px)',
            },
          }}
          open
        >
          {sidebarContent}
        </Drawer>
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
          pt: 7,
        }}
      >
        {children}
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: isDark 
              ? '0 4px 20px rgba(0,0,0,0.5)' 
              : '0 4px 20px rgba(0,0,0,0.1)',
            minWidth: 180,
            ml: 1,
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
    </Box>
  )
}
