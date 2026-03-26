'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box,
  Container,
  Typography,
  Chip,
} from '@mui/material'
import { useThemeStore } from '@/stores/themeStore'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'
import type { Locale } from '@/i18n/config'
import { PublicNavbar } from '@/components/PublicNavbar'

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
  author?: {
    id: string
    display_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
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
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'

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
      <PublicNavbar locale={locale} />

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
              {post.author?.display_name ? ` ${post.author.display_name}` : ''}
              {!post.author?.display_name && post.author?.email ? ` ${post.author.email.split('@')[0]}` : ''}
            </Typography>
            <Typography variant="body2">·</Typography>
            <Typography variant="body2">
              {new Date(post.published_at).toLocaleDateString()}
            </Typography>
            <Typography variant="body2">·</Typography>
            <Typography variant="body2">
              {post.view_count} {t('blog.views')}
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
