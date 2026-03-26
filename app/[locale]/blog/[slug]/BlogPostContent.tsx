'use client'

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
} from '@mui/material'
import {
  LightMode,
  DarkMode,
  Computer,
  ArrowBack,
} from '@mui/icons-material'
import { useThemeStore, CEYLON_ORANGE } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Logo } from '@/components/Logo'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'
import type { Locale } from '@/i18n/config'

interface BlogPost {
  id: string
  slug: string
  title: string
  subtitle: string
  content: string
  category: string
  published_at: string
  cover_image: string | null
  view_count: number
}

interface BlogPostContentProps {
  post: BlogPost
  locale: Locale
}

const categoryColors: Record<string, string> = {
  journey: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
  release: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  tech: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  case: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
}

export default function BlogPostContent({ post, locale }: BlogPostContentProps) {
  const router = useRouter()
  const t = useTranslations()
  const { mode, setMode, getEffectiveMode } = useThemeStore()
  const { user } = useAuthStore()
  const isDark = getEffectiveMode() === 'dark'

  const themeIcons = [
    { mode: 'light' as const, icon: <LightMode />, label: t('theme.light') },
    { mode: 'dark' as const, icon: <DarkMode />, label: t('theme.dark') },
    { mode: 'system' as const, icon: <Computer />, label: t('theme.system') },
  ]

  const currentThemeIcon = themeIcons.find((t) => t.mode === mode) || themeIcons[0]

  const getCategoryLabel = (category: string) => {
    const key = `blog.categories.${category}`
    return t(key) || category
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => setMode(currentThemeIcon.mode === 'light' ? 'dark' : currentThemeIcon.mode === 'dark' ? 'system' : 'light')}
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
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Back Button */}
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push(`/${locale}/blog`)}
          sx={{
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
            textTransform: 'none',
          }}
        >
          {t('common.back')}
        </Button>
      </Container>

      {/* Hero Section */}
      {post.cover_image && (
        <Box
          sx={{
            height: { xs: 200, md: 400 },
            background: categoryColors[post.category] || categoryColors.journey,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${post.cover_image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.8,
            }}
          />
        </Box>
      )}

      {/* Content */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}
      >
        <Box sx={{ maxWidth: '100%' }}>
          <Chip
            label={getCategoryLabel(post.category)}
            size="small"
            sx={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              mb: 2,
            }}
          />

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: isDark ? 'white' : '#0a0a0a',
              mb: 1,
            }}
          >
            {post.title}
          </Typography>

          {post.subtitle && (
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                fontWeight: 400,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                mb: 3,
              }}
            >
              {post.subtitle}
            </Typography>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              mb: 4,
              pb: 4,
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}
          >
            <Typography variant="body2">
              {t('blog.author')}
            </Typography>
            <Typography variant="body2">·</Typography>
            <Typography variant="body2">
              {new Date(post.published_at).toLocaleDateString()}
            </Typography>
            <Typography variant="body2">·</Typography>
            <Typography variant="body2">
              {post.view_count} {t('admin.overview.views') || 'views'}
            </Typography>
          </Box>

          <MarkdownRenderer content={post.content} />
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
