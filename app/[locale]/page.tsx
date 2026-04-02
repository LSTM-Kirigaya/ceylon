'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Fade,
  Paper,
} from '@mui/material'
import {
  AutoFixHigh,
  Sync,
  Terminal,
  Extension,
  KeyboardArrowDown,
  KeyboardDoubleArrowDown,
} from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { PublicNavbar } from '@/components/PublicNavbar'

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
        p: { xs: 2.5, sm: 4 },
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
  const { getEffectiveMode } = useThemeStore()
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

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
  const pricingPlans = [
    {
      key: 'starter',
      badge: t('home.pricing.starter.badge'),
      title: t('home.pricing.starter.title'),
      desc: t('home.pricing.starter.description'),
    },
    {
      key: 'team',
      badge: t('home.pricing.team.badge'),
      title: t('home.pricing.team.title'),
      desc: t('home.pricing.team.description'),
    },
    {
      key: 'enterprise',
      badge: t('home.pricing.enterprise.badge'),
      title: t('home.pricing.enterprise.title'),
      desc: t('home.pricing.enterprise.description'),
    },
  ]
  const blogHighlights = [
    {
      key: 'product',
      title: t('home.blog.cards.product.title'),
      desc: t('home.blog.cards.product.description'),
    },
    {
      key: 'engineering',
      title: t('home.blog.cards.engineering.title'),
      desc: t('home.blog.cards.engineering.description'),
    },
    {
      key: 'bestPractice',
      title: t('home.blog.cards.bestPractice.title'),
      desc: t('home.blog.cards.bestPractice.description'),
    },
  ]

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
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
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
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: 'stretch',
                mb: 4,
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={async () => {
                  if (user) {
                    router.push(`/dashboard`)
                    return
                  }
                  try {
                    const res = await fetch('/api/auth/session', { credentials: 'include' })
                    if (res.ok) {
                      router.push(`/dashboard`)
                      return
                    }
                  } catch {
                    // ignore
                  }
                  router.push(`/${locale}/register`)
                }}
                sx={{
                  backgroundColor: CEYLON_ORANGE,
                  px: { xs: 2, sm: 4 },
                  py: 1.5,
                  width: { xs: '100%', sm: 'auto' },
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
                  px: { xs: 2, sm: 4 },
                  py: 1.5,
                  width: { xs: '100%', sm: 'auto' },
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
                maxWidth: { xs: '100%', sm: 560 },
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
                  p: { xs: 1.5, sm: 2 },
                  backgroundColor: isDark ? '#0a0a0a' : '#f5f5f4',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  color: isDark ? '#a8a29e' : '#57534e',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
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
                    alignSelf: { xs: 'stretch', sm: 'auto' },
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
                gap: { xs: 1.5, sm: 3 },
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
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
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
            display: { xs: 'none', md: 'flex' },
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

      {/* Pricing Preview Section */}
      <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="overline"
            sx={{
              color: CEYLON_ORANGE,
              fontWeight: 600,
              letterSpacing: '0.1em',
              fontSize: '0.875rem',
            }}
          >
            {t('home.pricing.overline')}
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
            {t('home.pricing.title')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 1.5,
              color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)',
              maxWidth: 720,
              mx: 'auto',
            }}
          >
            {t('home.pricing.subtitle')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {pricingPlans.map((plan) => (
            <Paper
              key={plan.key}
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 3,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              <Chip
                size="small"
                label={plan.badge}
                sx={{
                  mb: 1.5,
                  backgroundColor: `${CEYLON_ORANGE}1a`,
                  color: CEYLON_ORANGE,
                  fontWeight: 600,
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? 'white' : '#1c1917' }}>
                {plan.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 1, lineHeight: 1.7, color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}
              >
                {plan.desc}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => router.push(`/${locale}/pricing`)}
            sx={{
              textTransform: 'none',
              borderColor: CEYLON_ORANGE,
              color: CEYLON_ORANGE,
              width: { xs: '100%', sm: 'auto' },
              px: 3,
              py: 1.2,
            }}
          >
            {t('home.pricing.cta')}
          </Button>
        </Box>
      </Container>

      {/* Blog Preview Section */}
      <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 10 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="overline"
            sx={{
              color: CEYLON_ORANGE,
              fontWeight: 600,
              letterSpacing: '0.1em',
              fontSize: '0.875rem',
            }}
          >
            {t('home.blog.overline')}
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
            {t('home.blog.title')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 1.5,
              color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)',
              maxWidth: 720,
              mx: 'auto',
            }}
          >
            {t('home.blog.subtitle')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {blogHighlights.map((item) => (
            <Paper
              key={item.key}
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 3,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? 'white' : '#1c1917' }}>
                {item.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 1, lineHeight: 1.7, color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}
              >
                {item.desc}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => router.push(`/${locale}/blog`)}
            sx={{
              textTransform: 'none',
              borderColor: CEYLON_ORANGE,
              color: CEYLON_ORANGE,
              width: { xs: '100%', sm: 'auto' },
              px: 3,
              py: 1.2,
            }}
          >
            {t('home.blog.cta')}
          </Button>
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
