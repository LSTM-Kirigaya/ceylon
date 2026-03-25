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
  Paper,
  Chip,
} from '@mui/material'
import {
  LightMode,
  DarkMode,
  Computer,
} from '@mui/icons-material'
import { useThemeStore, CEYLON_ORANGE } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Logo } from '@/components/Logo'

// Blog post data - using translation keys for categories
const getBlogPosts = (t: (key: string) => string) => [
  {
    id: 1,
    title: 'The Birth of ceylonm: Why We Decided to Build This Project',
    category: t('blog.categories.journey'),
    date: '2024-03-15',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    size: 'large',
  },
  {
    id: 2,
    title: 'v0.5.0 Release: New UI and Multi-language Support',
    category: t('blog.categories.release'),
    date: '2024-03-10',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    size: 'small',
  },
  {
    id: 3,
    title: 'How We Built the AI-Powered Requirements Analysis',
    category: t('blog.categories.tech'),
    date: '2024-03-05',
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    size: 'small',
  },
]

const getCategoryKey = (category: string) => {
  const keyMap: Record<string, string> = {
    'All': 'blog.categories.all',
    'Journey': 'blog.categories.journey',
    'Release': 'blog.categories.release',
    'Tech Deep Dive': 'blog.categories.tech',
    'Case Studies': 'blog.categories.case',
  }
  return keyMap[category] || category
}

export default function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter()
  const { locale } = use(params)
  const t = useTranslations()
  const { mode, setMode, getEffectiveMode } = useThemeStore()
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const blogPosts = getBlogPosts(t)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const themeIcons = [
    { mode: 'light' as const, icon: <LightMode />, label: t('theme.light') },
    { mode: 'dark' as const, icon: <DarkMode />, label: t('theme.dark') },
    { mode: 'system' as const, icon: <Computer />, label: t('theme.system') },
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

  const currentThemeIcon = themeIcons.find((t) => t.mode === mode) || themeIcons[0]

  const filteredPosts = activeCategory === 'All' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === t(getCategoryKey(activeCategory)))

  if (!mounted) {
    return null
  }

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

            <LanguageSwitcher />

            {user ? (
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
                  onClick={() => router.push('/register')}
                  sx={{
                    backgroundColor: CEYLON_ORANGE,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    ml: 1,
                  }}
                >
                  {t('home.hero.startNow')}
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Blog Header */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: isDark ? 'white' : '#0a0a0a',
              mb: 2,
            }}
          >
            {t('blog.title')}
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1rem', md: '1.125rem' },
              fontWeight: 400,
              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              maxWidth: 640,
              mx: 'auto',
            }}
          >
            {t('blog.subtitle')}
          </Typography>
        </Box>

        {/* Category Filter */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            justifyContent: 'center',
            flexWrap: 'wrap',
            mb: 6,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            pb: 2,
          }}
        >
          {['All', 'Journey', 'Release', 'Tech Deep Dive', 'Case Studies'].map((category) => (
            <Button
              key={category}
              onClick={() => setActiveCategory(category)}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                color: activeCategory === category 
                  ? isDark ? 'white' : '#0a0a0a'
                  : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                backgroundColor: activeCategory === category
                  ? isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                  : 'transparent',
                borderRadius: 10,
                px: 3,
                py: 0.75,
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              }}
            >
              {t(getCategoryKey(category))}
            </Button>
          ))}
        </Box>

        {/* Blog Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
            gap: 3,
          }}
        >
          {/* Large Post */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Box
              sx={{
                height: 320,
                background: blogPosts[0].gradient,
                position: 'relative',
                p: 3,
              }}
            >
              <Chip
                label={blogPosts[0].category}
                size="small"
                sx={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  fontWeight: 500,
                }}
              />
            </Box>
            <Box sx={{ p: 3 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: isDark ? 'white' : '#0a0a0a',
                  mb: 2,
                  lineHeight: 1.4,
                }}
              >
                {blogPosts[0].title}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                }}
              >
                {t('blog.author')} · {blogPosts[0].date}
              </Typography>
            </Box>
          </Paper>

          {/* Small Posts */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {blogPosts.slice(1).map((post) => (
              <Paper
                key={post.id}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                  flex: 1,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box
                  sx={{
                    height: 140,
                    background: post.gradient,
                    position: 'relative',
                    p: 2,
                  }}
                >
                  <Chip
                    label={post.category}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      fontWeight: 500,
                    }}
                  />
                </Box>
                <Box sx={{ p: 2 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: isDark ? 'white' : '#0a0a0a',
                      mb: 1,
                      fontSize: '0.95rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {post.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                    }}
                  >
                    {t('blog.author')} · {post.date}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          py: 4,
          textAlign: 'center',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          mt: 'auto',
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
