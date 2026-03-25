'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material'
import { Email } from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Logo } from '@/components/Logo'

export default function ForgotPasswordPage() {
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isDark = getEffectiveMode() === 'dark'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email')
      } else {
        setSuccess(true)
      }
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
            borderRadius: 2,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Logo */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Logo width={64} height={64} />
            </Box>

            <Typography
              variant="h4"
              sx={{
                textAlign: 'center',
                mb: 1,
                fontWeight: 600,
                color: isDark ? 'white' : '#1c1917',
              }}
            >
              找回密码
            </Typography>

            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                mb: 3,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              }}
            >
              输入您的邮箱地址，我们将发送重置密码链接
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                重置密码邮件已发送，请检查您的邮箱。
              </Alert>
            ) : (
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="邮箱"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading || !email}
                  sx={{
                    backgroundColor: CEYLON_ORANGE,
                    '&:hover': { backgroundColor: '#A34712' },
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: 2,
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : '发送重置链接'}
                </Button>
              </form>
            )}

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography
                variant="body2"
                sx={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                }}
              >
                想起密码了？{' '}
                <Link
                  href="/login"
                  style={{
                    color: CEYLON_ORANGE,
                    textDecoration: 'none',
                  }}
                >
                  立即登录
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
