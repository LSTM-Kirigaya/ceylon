'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Chip,
  Skeleton,
} from '@mui/material'
import { useThemeStore } from '@/stores/themeStore'
import { PublicNavbar } from '@/components/PublicNavbar'

interface BlogPost {
  id: string
  slug: string
  title: string
  subtitle: string
  category: string
  published_at: string
  excerpt: string
  cover_image: string | null
  view_count: number
  author?: {
    id: string
    display_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

export default function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter()
  const { locale } = use(params)
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const [mounted, setMounted] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/blog')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts)
      }
    } finally {
      setLoading(false)
    }
  }

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const categories = ['all', 'journey', 'release', 'tech', 'case']

  const getCategoryLabel = (category: string) => {
    const key = `blog.categories.${category}`
    return t(key) || category
  }

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      journey: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
      release: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      tech: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      case: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    }
    return colors[category] || colors.journey
  }

  const filteredPosts = activeCategory === 'all'
    ? posts
    : posts.filter(post => post.category === activeCategory)

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
      <PublicNavbar locale={locale} />

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
          {categories.map((category) => (
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
              {getCategoryLabel(category)}
            </Button>
          ))}
        </Box>

        {/* Blog Grid */}
        {loading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Skeleton variant="rectangular" height={190} sx={{ borderRadius: 3 }} />
              <Skeleton variant="rectangular" height={190} sx={{ borderRadius: 3 }} />
            </Box>
          </Box>
        ) : filteredPosts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              {t('blog.empty')}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
              gap: 3,
            }}
          >
            {/* Featured Post (First) */}
            {filteredPosts[0] && (
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
                onClick={() => router.push(`/${locale}/blog/${filteredPosts[0].slug}`)}
              >
                <Box
                  sx={{
                    height: 320,
                    background: filteredPosts[0].cover_image
                      ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${filteredPosts[0].cover_image})`
                      : getCategoryColor(filteredPosts[0].category),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    p: 3,
                  }}
                >
                  <Chip
                    label={getCategoryLabel(filteredPosts[0].category)}
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
                      mb: 1,
                      lineHeight: 1.4,
                    }}
                  >
                    {filteredPosts[0].title}
                  </Typography>
                  {filteredPosts[0].excerpt && (
                    <Typography
                      sx={{
                        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                        mb: 2,
                        lineHeight: 1.6,
                      }}
                    >
                      {filteredPosts[0].excerpt}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                    }}
                  >
                    {t('blog.author')}
                    {filteredPosts[0].author?.display_name ? ` ${filteredPosts[0].author.display_name}` : ''}
                    {!filteredPosts[0].author?.display_name && filteredPosts[0].author?.email ? ` ${filteredPosts[0].author.email.split('@')[0]}` : ''}
                    {' · '}
                    {new Date(filteredPosts[0].published_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* Other Posts */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {filteredPosts.slice(1).map((post) => (
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
                  onClick={() => router.push(`/${locale}/blog/${post.slug}`)}
                >
                  <Box
                    sx={{
                      height: 140,
                      background: post.cover_image
                        ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${post.cover_image})`
                        : getCategoryColor(post.category),
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                      p: 2,
                    }}
                  >
                    <Chip
                      label={getCategoryLabel(post.category)}
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
                      {t('blog.author')}
                      {post.author?.display_name ? ` ${post.author.display_name}` : ''}
                      {!post.author?.display_name && post.author?.email ? ` ${post.author.email.split('@')[0]}` : ''}
                      {' · '}
                      {new Date(post.published_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
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
