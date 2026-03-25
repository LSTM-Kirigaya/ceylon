'use client'

import { useState, use, useEffect } from 'react'

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
  ArrowBack,
} from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Logo } from '@/components/Logo'

// 登录表单数据
interface LoginFormData {
  email: string
  password: string
}

// 找回密码表单数据
interface ForgotPasswordFormData {
  email: string
}

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 切换登录/找回密码模式
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)

  // 登录表单验证
  const loginSchema = yup.object({
    email: yup
      .string()
      .required(t('auth.login.errors.emailRequired'))
      .email(t('auth.login.errors.emailInvalid')),
    password: yup
      .string()
      .required(t('auth.login.errors.passwordRequired'))
      .min(8, t('auth.login.errors.passwordMin')),
  })

  // 找回密码表单验证
  const forgotSchema = yup.object({
    email: yup
      .string()
      .required('请输入邮箱地址')
      .email('请输入有效的邮箱地址'),
  })

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
    watch: watchLogin,
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  })

  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    formState: { errors: forgotErrors },
    reset: resetForgotForm,
    setValue: setForgotValue,
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotSchema),
  })

  // 监听登录表单的邮箱值
  const loginEmailValue = watchLogin('email')

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  // 登录提交
  const onLoginSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setError(null)

    try {
      console.log('Attempting login...', data.email)
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(t('auth.login.errors.timeout'))), 10000)
      })
      
      const loginPromise = fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: data.email, password: data.password }),
      }).then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(body.error || t('auth.login.errors.loginFailed'))
        }
        return body
      })

      await Promise.race([loginPromise, timeoutPromise as Promise<unknown>])

      console.log('Login successful, redirecting...')
      await new Promise((resolve) => setTimeout(resolve, 200))
      window.location.href = `/${locale}/dashboard`
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || t('auth.login.errors.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 找回密码提交
  const onForgotSubmit = async (data: ForgotPasswordFormData) => {
    setForgotPasswordLoading(true)
    setForgotPasswordError(null)
    setForgotPasswordSuccess(false)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })

      const result = await response.json()

      if (!response.ok) {
        setForgotPasswordError(result.error || '发送重置邮件失败')
      } else {
        setForgotPasswordSuccess(true)
      }
    } catch (e) {
      setForgotPasswordError('网络错误，请稍后重试')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  // 切换到找回密码模式
  const handleForgotPasswordClick = () => {
    setIsForgotPassword(true)
    setError(null)
    setForgotPasswordError(null)
    setForgotPasswordSuccess(false)
    
    // 自动填充登录页面的邮箱
    if (loginEmailValue) {
      setForgotValue('email', loginEmailValue)
    }
  }

  // 返回登录模式
  const handleBackToLogin = () => {
    setIsForgotPassword(false)
    setForgotPasswordError(null)
    setForgotPasswordSuccess(false)
    resetForgotForm()
  }

  return (
    <Box
      className="flex min-h-dvh w-full items-center justify-center p-4"
      sx={{
        background: isDark
          ? 'linear-gradient(180deg, #0c0a09 0%, #1c1917 100%)'
          : 'linear-gradient(180deg, #fafaf9 0%, #ffffff 100%)',
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
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Logo width={56} height={56} />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  color: isDark ? 'white' : '#1c1917',
                }}
              >
                {isForgotPassword ? '找回密码' : t('auth.login.title')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mt: 1,
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                }}
              >
                {isForgotPassword 
                  ? '输入您的邮箱地址，我们将发送重置密码链接' 
                  : t('auth.login.subtitle')}
              </Typography>
            </Box>

            {/* 登录表单 */}
            {!isForgotPassword && (
              <>
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmitLogin(onLoginSubmit)}>
                  <TextField
                    fullWidth
                    label={t('auth.login.email')}
                    margin="normal"
                    {...registerLogin('email')}
                    error={!!loginErrors.email}
                    helperText={loginErrors.email?.message}
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
                    {...registerLogin('password')}
                    error={!!loginErrors.password}
                    helperText={loginErrors.password?.message}
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

                  {/* 忘记密码链接 */}
                  <Box sx={{ textAlign: 'right', mt: 1 }}>
                    <Button
                      onClick={handleForgotPasswordClick}
                      sx={{
                        color: CEYLON_ORANGE,
                        textTransform: 'none',
                        p: 0,
                        minWidth: 'auto',
                        '&:hover': {
                          backgroundColor: 'transparent',
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      忘记密码？
                    </Button>
                  </Box>

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
                      href="/register"
                      style={{
                        color: CEYLON_ORANGE,
                        textDecoration: 'none',
                      }}
                    >
                      {t('auth.login.registerNow')}
                    </Link>
                  </Typography>
                </Box>
              </>
            )}

            {/* 找回密码表单 */}
            {isForgotPassword && (
              <>
                {forgotPasswordError && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {forgotPasswordError}
                  </Alert>
                )}

                {forgotPasswordSuccess && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    重置密码邮件已发送，请检查您的邮箱。
                  </Alert>
                )}

                <form onSubmit={handleSubmitForgot(onForgotSubmit)}>
                  <TextField
                    fullWidth
                    label="邮箱"
                    type="email"
                    margin="normal"
                    {...registerForgot('email')}
                    error={!!forgotErrors.email}
                    helperText={forgotErrors.email?.message}
                    disabled={forgotPasswordLoading || forgotPasswordSuccess}
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

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={forgotPasswordLoading || forgotPasswordSuccess}
                    sx={{
                      mt: 3,
                      mb: 2,
                      backgroundColor: CEYLON_ORANGE,
                      '&:hover': { backgroundColor: '#A34712' },
                      py: 1.5,
                    }}
                  >
                    {forgotPasswordLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      '发送重置链接'
                    )}
                  </Button>
                </form>

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    onClick={handleBackToLogin}
                    startIcon={<ArrowBack />}
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: 'transparent',
                        color: CEYLON_ORANGE,
                      },
                    }}
                  >
                    返回登录
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
