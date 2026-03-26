'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box,
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  Fade,
  Menu,
  MenuItem,
  ListItemText,
  Paper,
  Avatar,
  Divider,
} from '@mui/material'
import {
  LightMode,
  DarkMode,
  Computer,
  AutoFixHigh,
  Sync,
  Terminal,
  Extension,
  KeyboardArrowDown,
  KeyboardDoubleArrowDown,
  Person,
  Settings,
  Logout,
} from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Logo } from '@/components/Logo'

// Feature card component with icon, title and description
function FeatureCard({
  icon,
  title,
  description,
  isDark,
}: {
  icon: React.ReactNode
  title: string
  description: string
  isDark: boolean
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        height: '100%',
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: CEYLON_ORANGE,
          transform: 'translateY(-4px)',
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${CEYLON_ORANGE}20`,
          color: CEYLON_ORANGE,
          mb: 2,
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          mb: 1,
          color: isDark ? 'white' : '#1c1917',
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          lineHeight: 1.7,
        }}
      >
        {description}
      </Typography>
    </Paper>
  )
}

export default function Home({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter()
  const { locale } = use(params)
  const t = useTranslations()
  const { mode, setMode, getEffectiveMode } = useThemeStore()
  const { user, profile } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const themeMenuOpen = Boolean(anchorEl)

  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const userMenuOpen = Boolean(userMenuAnchor)

  const themeIcons = [
    { mode: 'light' as const, icon: <LightMode />, label: t('theme.light') },
    { mode: 'dark' as const, icon: <DarkMode />, label: t('theme.dark') },
    { mode: 'system' as const, icon: <Computer />, label: t('theme.system') },
  ]

  const features = [
    {
      icon: <AutoFixHigh sx={{ fontSize: 28 }} />,
      title: t('home.features.aiFeedback.title'),
      description: t('home.features.aiFeedback.description'),
    },
    {
      icon: <Sync sx={{ fontSize: 28 }} />,
      title: t('home.features.smartIteration.title'),
      description: t('home.features.smartIteration.description'),
    },
    {
      icon: <Extension sx={{ fontSize: 28 }} />,
      title: t('home.features.smartImport.title'),
      description: t('home.features.smartImport.description'),
    },
    {
      icon: <Terminal sx={{ fontSize: 28 }} />,
      title: t('home.features.aiCli.title'),
      description: t('home.features.aiCli.description'),
    },
  ]

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleThemeMenuClose = () => {
    setAnchorEl(null)
  }

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null)
  }

  const handleLogout = () => {
    handleUserMenuClose()
    // 触发登出逻辑
    window.location.href = `/${locale}/logout`
  }

  const handleThemeSelect = (themeMode: 'light' | 'dark' | 'system') => {
    setMode(themeMode)
    handleThemeMenuClose()
  }

  const currentThemeIcon = themeIcons.find((t) => t.mode === mode) || themeIcons[0]

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDark
          ? 'radial-gradient(ellipse at top, rgba(249, 115, 22, 0.08) 0%, transparent 50%), linear-gradient(180deg, #0a0a0a 0%, #111111 100%)'
          : 'linear-gradient(180deg, #fafaf9 0%, #ffffff 100%)',
      }}
    >
      {/* Navigation */}
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
            {[
              { label: t('nav.docs'), href: `/${locale}/docs` },
              { label: t('nav.blog'), href: `/${locale}/blog` },
              { label: t('nav.pricing'), href: `/${locale}/pricing` },
            ].map((item) => (
              <Button
                key={item.label}
                onClick={() => router.push(item.href)}
                sx={{
                  color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  px: 2,
                  py: 0.75,
                  borderRadius: 2,
                  '&:hover': {
                    color: isDark ? 'white' : '#1c1917',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
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
                  sx={{
                    color: mode === themeMode ? CEYLON_ORANGE : isDark ? 'white' : '#1c1917',
                  }}
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
                  onClick={() => router.push(`/${locale}/dashboard`)}
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
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
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
                      sx={{
                        fontWeight: 600,
                        color: isDark ? 'white' : '#1c1917',
                      }}
                    >
                      {profile?.display_name || user?.email}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                      }}
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
                  <MenuItem
                    onClick={handleLogout}
                    sx={{ color: '#ef4444' }}
                  >
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
                  sx={{
                    color: isDark ? 'white' : '#1c1917',
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  {t('auth.login.submit')}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => router.push(`/${locale}/dashboard`)}
                  sx={{
                    backgroundColor: CEYLON_ORANGE,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    ml: 1,
                  }}
                >
                  {t('home.hero.dashboard')}
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section - Full Viewport Height */}
      <Box
        sx={{
          minHeight: 'calc(100vh - 30px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Fade in={mounted} timeout={1000}>
          <Box sx={{ textAlign: 'center' }}>
            {/* Badge */}
            <Chip
              icon={<AutoFixHigh sx={{ fontSize: 16 }} />}
              label={t('home.hero.badge')}
              sx={{
                mb: 4,
                backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',
                color: CEYLON_ORANGE,
                border: `1px solid ${isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)'}`,
                fontWeight: 500,
                '& .MuiChip-icon': {
                  color: CEYLON_ORANGE,
                },
              }}
            />

            {/* Main Title */}
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem' },
                fontWeight: 800,
                letterSpacing: '-0.03em',
                mb: 2,
                color: isDark ? 'white' : '#0a0a0a',
                lineHeight: 1.1,
              }}
            >
              {t('home.hero.title')}
            </Typography>

            {/* Subtitle */}
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                fontWeight: 400,
                mb: 4,
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                maxWidth: 640,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              {t('home.hero.subtitle')}
            </Typography>

            {/* CTA Buttons */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'center',
                flexWrap: 'wrap',
                mb: 4,
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() =>
                  router.push(user ? `/${locale}/dashboard` : `/${locale}/register`)
                }
                sx={{
                  backgroundColor: CEYLON_ORANGE,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  boxShadow: `0 8px 32px ${CEYLON_ORANGE}40`,
                  '&:hover': {
                    backgroundColor: '#ea580c',
                    boxShadow: `0 12px 40px ${CEYLON_ORANGE}60`,
                  },
                }}
              >
                {t('home.hero.startProject')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push(`/${locale}/login`)}
                endIcon={<KeyboardArrowDown />}
                sx={{
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  color: isDark ? 'white' : '#1c1917',
                  '&:hover': {
                    borderColor: CEYLON_ORANGE,
                    color: CEYLON_ORANGE,
                    backgroundColor: 'transparent',
                  },
                }}
              >
                {t('home.hero.learnMore')}
              </Button>
            </Box>

            {/* CLI Install Box */}
            <Paper
              elevation={0}
              sx={{
                maxWidth: 560,
                mx: 'auto',
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {/* Tab Header */}
              <Box
                sx={{
                  display: 'flex',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    py: 1.5,
                    textAlign: 'center',
                    backgroundColor: isDark ? `${CEYLON_ORANGE}20` : `${CEYLON_ORANGE}10`,
                    borderBottom: `2px solid ${CEYLON_ORANGE}`,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: isDark ? 'white' : '#1c1917',
                    }}
                  >
                    Install CLI
                  </Typography>
                </Box>
              </Box>
              
              {/* Code Block */}
              <Box
                sx={{
                  p: 2,
                  backgroundColor: isDark ? '#0a0a0a' : '#f5f5f4',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.875rem',
                  color: isDark ? '#a8a29e' : '#57534e',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="span" sx={{ color: '#22c55e' }}>$</Box>
                  <span>npm install -g @ceylonm/cli</span>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    navigator.clipboard.writeText('npm install -g @ceylonm/cli')
                  }}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                    minWidth: 'auto',
                    px: 1.5,
                  }}
                >
                  Copy
                </Button>
              </Box>
            </Paper>

            {/* Feature Tags */}
            <Box
              sx={{
                display: 'flex',
                gap: 3,
                justifyContent: 'center',
                flexWrap: 'wrap',
                mt: 4,
              }}
            >
              {[
                { icon: '🚀', label: 'AI 智能反馈' },
                { icon: '⚡', label: '自动迭代闭环' },
                { icon: '🔌', label: '本地 AI 集成' },
              ].map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    fontSize: '0.875rem',
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Box>
              ))}
            </Box>

          </Box>
        </Fade>
      </Container>

        {/* Scroll indicator - Floating Animation */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            animation: 'float 2s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': {
                transform: 'translateX(-50%) translateY(0)',
              },
              '50%': {
                transform: 'translateX(-50%) translateY(8px)',
              },
            },
            '&:hover': {
              opacity: 0.8,
            },
          }}
          onClick={() => {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              fontSize: '0.875rem',
            }}
          >
            {t('home.hero.scrollHint')}
          </Typography>
          <KeyboardDoubleArrowDown
            sx={{
              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              fontSize: 24,
            }}
          />
        </Box>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="overline"
            sx={{
              color: CEYLON_ORANGE,
              fontWeight: 600,
              letterSpacing: '0.1em',
              fontSize: '0.875rem',
            }}
          >
            {t('home.features.overline')}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: isDark ? 'white' : '#0a0a0a',
              mt: 1,
              fontSize: { xs: '1.75rem', md: '2.25rem' },
            }}
          >
            {t('home.features.title')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              isDark={isDark}
            />
          ))}
        </Box>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          py: 4,
          textAlign: 'center',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          mt: 4,
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
        >
          {t('home.footer.copyright')}
        </Typography>
      </Box>
    </Box>
  )
}
