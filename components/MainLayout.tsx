'use client'

import { ReactNode, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  Folder,
  Settings,
  Logout,
  LightMode,
  DarkMode,
  Computer,
  AccountCircle,
  KeyboardArrowDown,
  Check,
} from '@mui/icons-material'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'

interface MainLayoutProps {
  children: ReactNode
}

const drawerWidth = 260

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, signOut } = useAuthStore()
  const { mode, setMode, getEffectiveMode } = useThemeStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [themeAnchorEl, setThemeAnchorEl] = useState<null | HTMLElement>(null)

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
    router.push('/login')
  }

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setThemeAnchorEl(event.currentTarget)
  }

  const handleThemeMenuClose = () => {
    setThemeAnchorEl(null)
  }

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode)
    handleThemeMenuClose()
  }

  const getThemeIcon = (themeMode: ThemeMode) => {
    switch (themeMode) {
      case 'light':
        return <LightMode sx={{ fontSize: 18 }} />
      case 'dark':
        return <DarkMode sx={{ fontSize: 18 }} />
      case 'system':
        return <Computer sx={{ fontSize: 18 }} />
    }
  }

  const getThemeLabel = (themeMode: ThemeMode) => {
    switch (themeMode) {
      case 'light':
        return '浅色'
      case 'dark':
        return '深色'
      case 'system':
        return '跟随系统'
    }
  }

  const menuItems = [
    { text: '控制台', icon: <Dashboard />, path: '/dashboard' },
    { text: '项目', icon: <Folder />, path: '/dashboard' },
  ]

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            backgroundColor: CEYLON_ORANGE,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 18 }}>
            C
          </Typography>
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: isDark ? 'white' : '#1c1917',
          }}
        >
          锡兰 CEYLON
        </Typography>
      </Box>

      {/* Menu Items */}
      <Box sx={{ flex: 1, py: 2, px: 1.5 }}>
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 1,
            display: 'block',
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          工作区
        </Typography>
        {menuItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Box
              key={item.path}
              onClick={() => {
                router.push(item.path)
                setMobileOpen(false)
              }}
              sx={{
                mx: 0.5,
                px: 2,
                py: 1.25,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: isActive 
                  ? isDark 
                    ? 'rgba(200, 92, 27, 0.15)' 
                    : 'rgba(200, 92, 27, 0.08)' 
                  : 'transparent',
                color: isActive 
                  ? CEYLON_ORANGE 
                  : isDark 
                    ? 'rgba(255,255,255,0.7)' 
                    : 'rgba(0,0,0,0.65)',
                '&:hover': {
                  backgroundColor: isActive 
                    ? isDark 
                      ? 'rgba(200, 92, 27, 0.2)' 
                      : 'rgba(200, 92, 27, 0.12)' 
                    : isDark 
                      ? 'rgba(255,255,255,0.05)' 
                      : 'rgba(0,0,0,0.03)',
                },
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                color: isActive ? CEYLON_ORANGE : 'inherit',
              }}>
                {item.icon}
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                }}
              >
                {item.text}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* User Section */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            pb: 1,
            display: 'block',
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          账户
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            },
          }}
          onClick={handleProfileMenuOpen}
        >
          <Avatar
            src={profile?.avatar_url || undefined}
            sx={{
              width: 36,
              height: 36,
              backgroundColor: CEYLON_ORANGE,
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: isDark ? 'white' : '#1c1917',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.85rem',
                lineHeight: 1.4,
              }}
            >
              {profile?.display_name || profile?.email}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                fontSize: '0.75rem',
                lineHeight: 1.3,
              }}
            >
              {profile?.email}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: isDark ? '#0c0a09' : '#fafaf9',
          boxShadow: 'none',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: isDark ? 'white' : '#1c1917' }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Theme Toggle Dropdown */}
          <Button
            onClick={handleThemeMenuOpen}
            startIcon={getThemeIcon(mode)}
            endIcon={<KeyboardArrowDown />}
            sx={{
              color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
              textTransform: 'none',
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              minWidth: 'auto',
              fontSize: '0.9rem',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              },
            }}
          >
            {getThemeLabel(mode)}
          </Button>
          
          {/* Theme Menu */}
          <Menu
            anchorEl={themeAnchorEl}
            open={Boolean(themeAnchorEl)}
            onClose={handleThemeMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                minWidth: 140,
                mt: 0.5,
              },
            }}
          >
            {(['light', 'dark', 'system'] as ThemeMode[]).map((themeMode) => (
              <MenuItem
                key={themeMode}
                onClick={() => handleThemeChange(themeMode)}
                sx={{
                  gap: 1.5,
                  color: mode === themeMode ? CEYLON_ORANGE : 'inherit',
                }}
              >
                <ListItemIcon
                  sx={{
                    color: mode === themeMode ? CEYLON_ORANGE : 'inherit',
                    minWidth: 'auto',
                  }}
                >
                  {getThemeIcon(themeMode)}
                </ListItemIcon>
                <ListItemText
                  primary={getThemeLabel(themeMode)}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '0.9rem',
                      fontWeight: mode === themeMode ? 600 : 400,
                    },
                  }}
                />
                {mode === themeMode && (
                  <Check sx={{ fontSize: 18, color: CEYLON_ORANGE, ml: 1 }} />
                )}
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
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
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: isDark ? '#0c0a09' : '#fafaf9',
              borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: isDark ? '#0c0a09' : '#fafaf9',
          mt: 8,
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
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { router.push('/profile'); handleProfileMenuClose() }}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText>个人资料</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { router.push('/settings'); handleProfileMenuClose() }}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>设置</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>退出登录</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  )
}
