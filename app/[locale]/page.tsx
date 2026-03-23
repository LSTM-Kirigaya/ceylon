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
  Card,
  CardContent,
  Grid,
  Fade,
  Menu,
  MenuItem,
  ListItemText,
} from '@mui/material'
import {
  LightMode,
  DarkMode,
  Computer,
  Storage,
  Group,
  TableChart,
  Terminal,
} from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function Home({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter()
  const { locale } = use(params)
  const t = useTranslations()
  const { mode, setMode, getEffectiveMode } = useThemeStore()
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const themeMenuOpen = Boolean(anchorEl)

  const themeIcons = [
    { mode: 'light' as const, icon: <LightMode />, label: t('theme.light') },
    { mode: 'dark' as const, icon: <DarkMode />, label: t('theme.dark') },
    { mode: 'system' as const, icon: <Computer />, label: t('theme.system') },
  ]

  const features = [
    {
      icon: <Storage sx={{ fontSize: 40 }} />,
      title: t('home.features.versionView.title'),
      description: t('home.features.versionView.description'),
    },
    {
      icon: <TableChart sx={{ fontSize: 40 }} />,
      title: t('home.features.requirements.title'),
      description: t('home.features.requirements.description'),
    },
    {
      icon: <Group sx={{ fontSize: 40 }} />,
      title: t('home.features.collaboration.title'),
      description: t('home.features.collaboration.description'),
    },
    {
      icon: <Terminal sx={{ fontSize: 40 }} />,
      title: t('home.features.cli.title'),
      description: t('home.features.cli.description'),
    },
  ]

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

  const currentThemeIcon = themeIcons.find(t => t.mode === mode) || themeIcons[0]

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDark
          ? 'linear-gradient(180deg, #0c0a09 0%, #1c1917 100%)'
          : 'linear-gradient(180deg, #fafaf9 0%, #ffffff 100%)',
      }}
    >
      {/* Navigation */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'transparent',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                backgroundColor: CEYLON_ORANGE,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
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
              {t('common.appName')}
            </Typography>
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
              <Button
                variant="contained"
                onClick={() => router.push(`/${locale}/dashboard`)}
                sx={{ backgroundColor: CEYLON_ORANGE }}
              >
                {t('home.hero.startProject')}
              </Button>
            ) : (
              <>
                <Button
                  variant="text"
                  onClick={() => router.push(`/${locale}/login`)}
                  sx={{ color: isDark ? 'white' : '#1c1917' }}
                >
                  {t('auth.login.submit')}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => router.push(`/${locale}/register`)}
                  sx={{ backgroundColor: CEYLON_ORANGE }}
                >
                  {t('home.hero.startNow')}
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: 12, pb: 8 }}>
        <Fade in={mounted} timeout={1000}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem' },
                fontWeight: 700,
                letterSpacing: '-0.025em',
                mb: 2,
                color: isDark ? 'white' : '#1c1917',
              }}
            >
              {t('home.hero.title1')}
            </Typography>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem' },
                fontWeight: 700,
                letterSpacing: '-0.025em',
                mb: 4,
                color: CEYLON_ORANGE,
              }}
            >
              {t('home.hero.title2')}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                maxWidth: 600,
                mx: 'auto',
                mb: 6,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              }}
            >
              {t('home.hero.description')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push(user ? `/${locale}/dashboard` : `/${locale}/register`)}
                sx={{ backgroundColor: CEYLON_ORANGE, px: 4, py: 1.5 }}
              >
                {user ? t('home.hero.startProject') : t('home.hero.startNow')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push(`/${locale}/login`)}
                sx={{ px: 4, py: 1.5 }}
              >
                {t('home.hero.learnMore')}
              </Button>
            </Box>
          </Box>
        </Fade>
      </Container>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h4"
          sx={{
            textAlign: 'center',
            mb: 6,
            fontWeight: 700,
            color: isDark ? 'white' : '#1c1917',
          }}
        >
          {t('home.features.title')}
        </Typography>
        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Card sx={{ height: '100%', backgroundColor: isDark ? '#1c1917' : '#ffffff' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ color: CEYLON_ORANGE, mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: isDark ? 'white' : '#1c1917' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer */}
      <Box sx={{ py: 4, textAlign: 'center', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
          {t('home.footer.copyright')}
        </Typography>
      </Box>
    </Box>
  )
}
