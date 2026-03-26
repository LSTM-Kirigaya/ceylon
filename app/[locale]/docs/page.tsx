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
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  MenuBook,
  RocketLaunch,
  Code,
  Settings,
} from '@mui/icons-material'
import { useThemeStore, CEYLON_ORANGE } from '@/stores/themeStore'
import { PublicNavbar } from '@/components/PublicNavbar'

const getDocSections = (t: (key: string) => string) => [
  {
    title: t('docs.sections.gettingStarted'),
    items: [
      { title: t('docs.items.introduction'), href: '#' },
      { title: t('docs.items.quickStart'), href: '#' },
      { title: t('docs.items.installation'), href: '#' },
    ],
  },
  {
    title: t('docs.sections.coreConcepts'),
    items: [
      { title: t('docs.items.projects'), href: '#' },
      { title: t('docs.items.requirements'), href: '#' },
      { title: t('docs.items.versionViews'), href: '#' },
    ],
  },
  {
    title: t('docs.sections.cli'),
    items: [
      { title: t('docs.items.cliInstallation'), href: '#' },
      { title: t('docs.items.commands'), href: '#' },
      { title: t('docs.items.configuration'), href: '#' },
    ],
  },
]

export default function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter()
  const { locale } = use(params)
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const [mounted, setMounted] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState('Introduction')

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const docSections = getDocSections(t)

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

      {/* Docs Content */}
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {/* Sidebar */}
          <Paper
            elevation={0}
            sx={{
              width: 280,
              flexShrink: 0,
              display: { xs: 'none', md: 'block' },
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 3,
              p: 2,
              height: 'fit-content',
            }}
          >
            {docSections.map((section, index) => (
              <Box key={section.title}>
                <Typography
                  variant="overline"
                  sx={{
                    px: 2,
                    py: 1,
                    display: 'block',
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                  }}
                >
                  {section.title}
                </Typography>
                <List dense disablePadding>
                  {section.items.map((item) => (
                    <ListItem key={item.title} disablePadding>
                      <ListItemButton
                        selected={selectedDoc === item.title}
                        onClick={() => setSelectedDoc(item.title)}
                        sx={{
                          borderRadius: 2,
                          py: 0.75,
                          color: selectedDoc === item.title 
                            ? CEYLON_ORANGE 
                            : isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
                          backgroundColor: selectedDoc === item.title
                            ? isDark ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.08)'
                            : 'transparent',
                          '&:hover': {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          },
                        }}
                      >
                        <ListItemText 
                          primary={item.title}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: selectedDoc === item.title ? 600 : 400,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                {index < docSections.length - 1 && (
                  <Divider sx={{ my: 2, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                )}
              </Box>
            ))}
          </Paper>

          {/* Main Content */}
          <Box sx={{ flex: 1, maxWidth: 720 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                fontWeight: 700,
                color: isDark ? 'white' : '#0a0a0a',
                mb: 3,
              }}
            >
              {t('docs.title')}
            </Typography>
            
            <Typography
              variant="body1"
              sx={{
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                lineHeight: 1.8,
                mb: 4,
              }}
            >
              {t('docs.subtitle')}
            </Typography>

            {/* Quick Links */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 3,
                mb: 6,
              }}
            >
              {[
                { icon: <RocketLaunch />, title: t('docs.quickLinks.quickStart.title'), desc: t('docs.quickLinks.quickStart.desc') },
                { icon: <MenuBook />, title: t('docs.quickLinks.coreConcepts.title'), desc: t('docs.quickLinks.coreConcepts.desc') },
                { icon: <Code />, title: t('docs.quickLinks.apiReference.title'), desc: t('docs.quickLinks.apiReference.desc') },
                { icon: <Settings />, title: t('docs.quickLinks.configuration.title'), desc: t('docs.quickLinks.configuration.desc') },
              ].map((item) => (
                <Paper
                  key={item.title}
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: CEYLON_ORANGE,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box sx={{ color: CEYLON_ORANGE, mb: 1.5 }}>{item.icon}</Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: isDark ? 'white' : '#0a0a0a',
                      mb: 0.5,
                      fontSize: '1rem',
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                    }}
                  >
                    {item.desc}
                  </Typography>
                </Paper>
              ))}
            </Box>

            <Typography
              variant="h2"
              sx={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: isDark ? 'white' : '#0a0a0a',
                mb: 2,
              }}
            >
              {t('docs.whatIsCeylon.title')}
            </Typography>
            
            <Typography
              variant="body1"
              sx={{
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                lineHeight: 1.8,
                mb: 3,
              }}
            >
              {t('docs.whatIsCeylon.p1')}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                lineHeight: 1.8,
              }}
            >
              {t('docs.whatIsCeylon.p2')}
            </Typography>
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
