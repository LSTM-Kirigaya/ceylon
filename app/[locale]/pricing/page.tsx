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
  Check,
  Close,
} from '@mui/icons-material'
import { useThemeStore, CEYLON_ORANGE } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Logo } from '@/components/Logo'

// Pricing plan data - using translation keys
const getPricingPlans = (t: (key: string) => string) => [
  {
    name: t('pricing.plans.free.name'),
    description: t('pricing.plans.free.description'),
    price: t('pricing.plans.free.price'),
    popular: false,
    features: t('pricing.plans.free.features').split('|').map((text: string, i: number) => ({
      text,
      included: i < 4,
    })),
    cta: t('pricing.plans.free.cta'),
    variant: 'outlined' as const,
  },
  {
    name: t('pricing.plans.pro.name'),
    description: t('pricing.plans.pro.description'),
    price: t('pricing.plans.pro.price'),
    popular: true,
    features: t('pricing.plans.pro.features').split('|').map((text: string) => ({
      text,
      included: true,
    })),
    cta: t('pricing.plans.pro.cta'),
    variant: 'contained' as const,
  },
  {
    name: t('pricing.plans.team.name'),
    description: t('pricing.plans.team.description'),
    price: t('pricing.plans.team.price'),
    popular: false,
    features: t('pricing.plans.team.features').split('|').map((text: string) => ({
      text,
      included: true,
    })),
    cta: t('pricing.plans.team.cta'),
    variant: 'outlined' as const,
  },
]

export default function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
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

  const pricingPlans = getPricingPlans(t)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const themeMenuOpen = Boolean(anchorEl)

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

      {/* Pricing Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
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
            {t('pricing.title')}
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1rem', md: '1.125rem' },
              fontWeight: 400,
              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              maxWidth: 560,
              mx: 'auto',
            }}
          >
            {t('pricing.subtitle')}
          </Typography>
        </Box>

        {/* Pricing Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
            alignItems: 'stretch',
          }}
        >
          {pricingPlans.map((plan) => (
            <Paper
              key={plan.name}
              elevation={0}
              sx={{
                position: 'relative',
                p: 4,
                borderRadius: 3,
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${plan.popular ? CEYLON_ORANGE : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                display: 'flex',
                flexDirection: 'column',
                ...(plan.popular && {
                  backgroundColor: isDark ? `${CEYLON_ORANGE}15` : `${CEYLON_ORANGE}08`,
                  boxShadow: isDark 
                    ? `0 0 0 1px ${CEYLON_ORANGE}80, 0 20px 40px ${CEYLON_ORANGE}20` 
                    : `0 0 0 1px ${CEYLON_ORANGE}50, 0 20px 40px ${CEYLON_ORANGE}15`,
                }),
              }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <Chip
                  label={t('pricing.mostPopular')}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: CEYLON_ORANGE,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                    px: 1,
                  }}
                />
              )}

              {/* Plan Name */}
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: isDark ? 'white' : '#0a0a0a',
                  textAlign: 'center',
                  mb: 0.5,
                }}
              >
                {plan.name}
              </Typography>

              {/* Description */}
              <Typography
                variant="body2"
                sx={{
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  textAlign: 'center',
                  mb: 3,
                }}
              >
                {plan.description}
              </Typography>

              {/* Price */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '1.5rem',
                    fontWeight: 400,
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    verticalAlign: 'top',
                  }}
                >
                  ¥
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '4rem',
                    fontWeight: 700,
                    color: isDark ? 'white' : '#0a0a0a',
                    lineHeight: 1,
                  }}
                >
                  {plan.price}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '1rem',
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  }}
                >
                  {t('pricing.perMonth')}
                </Typography>
              </Box>

              {/* Features */}
              <Box sx={{ flex: 1, mb: 4 }}>
                {plan.features.map((feature, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      py: 1,
                      color: feature.included
                        ? isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)'
                        : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    }}
                  >
                    {feature.included ? (
                      <Check sx={{ fontSize: 20, color: CEYLON_ORANGE, flexShrink: 0 }} />
                    ) : (
                      <Close sx={{ fontSize: 20, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', flexShrink: 0 }} />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: feature.included ? 400 : 400,
                        textDecoration: feature.included ? 'none' : 'line-through',
                      }}
                    >
                      {feature.text}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* CTA Button */}
              <Button
                fullWidth
                variant={plan.variant}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  borderRadius: 2,
                  ...(plan.popular
                    ? {
                        backgroundColor: CEYLON_ORANGE,
                        '&:hover': { backgroundColor: '#7c3aed' },
                      }
                    : {
                        borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                        color: isDark ? 'white' : '#1c1917',
                        '&:hover': {
                          borderColor: isDark ? 'white' : '#1c1917',
                          backgroundColor: 'transparent',
                        },
                      }),
                }}
              >
                {plan.cta}
              </Button>
            </Paper>
          ))}
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
