'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

const features = [
  {
    icon: <Storage sx={{ fontSize: 40 }} />,
    title: '版本视图管理',
    description: '为每个项目创建多个版本视图，清晰管理不同迭代的需求',
  },
  {
    icon: <TableChart sx={{ fontSize: 40 }} />,
    title: '需求表格',
    description: '灵活的需求表格，支持优先级、类型、负责人等多维度管理',
  },
  {
    icon: <Group sx={{ fontSize: 40 }} />,
    title: '团队协作',
    description: '细粒度的权限控制，支持读、写、管理三种角色',
  },
  {
    icon: <Terminal sx={{ fontSize: 40 }} />,
    title: 'CLI 工具',
    description: '命令行工具支持，让开发者可以在终端快速管理需求',
  },
]

export default function Home() {
  const router = useRouter()
  const { mode, setMode, getEffectiveMode } = useThemeStore()
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const themeIcons = [
    { mode: 'light' as const, icon: <LightMode />, label: '浅色' },
    { mode: 'dark' as const, icon: <DarkMode />, label: '深色' },
    { mode: 'system' as const, icon: <Computer />, label: '跟随系统' },
  ]

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
              锡兰 CEYLON
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {themeIcons.map(({ mode: themeMode, icon, label }) => (
              <IconButton
                key={themeMode}
                onClick={() => setMode(themeMode)}
                sx={{
                  color: mode === themeMode ? CEYLON_ORANGE : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  '&:hover': { color: CEYLON_ORANGE },
                }}
                title={label}
              >
                {icon}
              </IconButton>
            ))}
            
            {user ? (
              <Button
                variant="contained"
                onClick={() => router.push('/dashboard')}
                sx={{
                  backgroundColor: CEYLON_ORANGE,
                  '&:hover': { backgroundColor: '#A34712' },
                }}
              >
                进入控制台
              </Button>
            ) : (
              <>
                <Button
                  variant="text"
                  onClick={() => router.push('/login')}
                  sx={{ color: isDark ? 'white' : '#1c1917' }}
                >
                  登录
                </Button>
                <Button
                  variant="contained"
                  onClick={() => router.push('/register')}
                  sx={{
                    backgroundColor: CEYLON_ORANGE,
                    '&:hover': { backgroundColor: '#A34712' },
                  }}
                >
                  免费开始
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
              智能化需求管理
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
              让团队协作更高效
            </Typography>
            <Typography
              variant="h5"
              sx={{
                maxWidth: 600,
                mx: 'auto',
                mb: 6,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                fontWeight: 400,
              }}
            >
              锡兰是一个现代化的需求管理平台，帮助团队更好地组织、跟踪和协作处理需求
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push(user ? '/dashboard' : '/register')}
                sx={{
                  backgroundColor: CEYLON_ORANGE,
                  '&:hover': { backgroundColor: '#A34712' },
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                }}
              >
                {user ? '进入控制台' : '立即开始'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push('/login')}
                sx={{
                  borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  color: isDark ? 'white' : '#1c1917',
                  '&:hover': {
                    borderColor: CEYLON_ORANGE,
                    color: CEYLON_ORANGE,
                  },
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                }}
              >
                了解更多
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
            letterSpacing: '-0.025em',
            color: isDark ? 'white' : '#1c1917',
          }}
        >
          核心功能
        </Typography>
        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Card
                sx={{
                  height: '100%',
                  backgroundColor: isDark ? '#1c1917' : '#ffffff',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: isDark
                      ? '0 8px 30px rgba(0,0,0,0.4)'
                      : '0 8px 30px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      color: CEYLON_ORANGE,
                      mb: 2,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 1,
                      fontWeight: 600,
                      color: isDark ? 'white' : '#1c1917',
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          py: 4,
          textAlign: 'center',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          mt: 8,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
          }}
        >
          © 2024 锡兰 CEYLON. All rights reserved.
        </Typography>
      </Box>
    </Box>
  )
}
