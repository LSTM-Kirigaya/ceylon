'use client'

import { useState, use } from 'react'

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
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
} from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schema = yup.object({
    email: yup
      .string()
      .required(t('auth.login.errors.emailRequired'))
      .email(t('auth.login.errors.emailInvalid')),
    password: yup
      .string()
      .required(t('auth.login.errors.passwordRequired'))
      .min(8, t('auth.login.errors.passwordMin')),
  })

  type LoginFormData = yup.InferType<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  })

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setError(null)

    try {
      console.log('Attempting login...', data.email)
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(t('auth.login.errors.timeout'))), 10000)
      })
      
      const signInPromise = supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      
      const { data: signInData, error: signInError } = await Promise.race([
        signInPromise,
        timeoutPromise as any
      ])

      if (signInError) {
        console.error('Sign in error:', signInError)
        throw signInError
      }

      if (!signInData?.session) {
        throw new Error(t('auth.login.errors.loginFailed'))
      }

      console.log('Login successful, redirecting...')
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      window.location.href = `/${locale}/dashboard`
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || t('auth.login.errors.loginFailed'))
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
        background: isDark
          ? 'linear-gradient(180deg, #0c0a09 0%, #1c1917 100%)'
          : 'linear-gradient(180deg, #fafaf9 0%, #ffffff 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <LanguageSwitcher />
        </Box>
        <Card
          sx={{
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  backgroundColor: CEYLON_ORANGE,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Typography
                  sx={{
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 24,
                  }}
                >
                  C
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  color: isDark ? 'white' : '#1c1917',
                }}
              >
                {t('auth.login.title')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mt: 1,
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                }}
              >
                {t('auth.login.subtitle')}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField
                fullWidth
                label={t('auth.login.email')}
                margin="normal"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <TextField
                fullWidth
                label={t('auth.login.password')}
                type={showPassword ? 'text' : 'password'}
                margin="normal"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 2,
                  backgroundColor: CEYLON_ORANGE,
                  '&:hover': { backgroundColor: '#A34712' },
                  py: 1.5,
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  t('auth.login.submit')
                )}
              </Button>
            </form>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                }}
              >
                {t('auth.login.noAccount')}{' '}
                <Link
                  href={`/${locale}/register`}
                  style={{
                    color: CEYLON_ORANGE,
                    textDecoration: 'none',
                  }}
                >
                  {t('auth.login.registerNow')}
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
