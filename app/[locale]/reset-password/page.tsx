'use client'

import { useState, useEffect, use, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  IconButton,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Lock,
  CheckCircle,
} from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Logo } from '@/components/Logo'

interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

// 内部组件处理搜索参数
function ResetPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isDark = getEffectiveMode() === 'dark'
  const code = searchParams.get('code')

  const schema = yup.object({
    password: yup
      .string()
      .required('请输入新密码')
      .min(8, '密码至少需要 8 个字符'),
    confirmPassword: yup
      .string()
      .required('请确认密码')
      .oneOf([yup.ref('password')], '两次输入的密码不一致'),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(schema),
  })

  // 验证 code 并交换 session
  useEffect(() => {
    async function verifyCode() {
      if (!code) {
        setError('无效的重置链接，请重新申请重置密码')
        setVerifying(false)
        return
      }

      try {
        const response = await fetch('/api/auth/callback?' + new URLSearchParams({ code }))
        if (!response.ok && response.redirected) {
          // 如果回调重定向到错误页面，说明 code 无效
          const url = new URL(response.url)
          if (url.searchParams.get('error')) {
            setError('重置链接已过期或无效，请重新申请重置密码')
          }
        }
      } catch (e) {
        console.error('Verification error:', e)
      } finally {
        setVerifying(false)
      }
    }

    verifyCode()
  }, [code])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: data.password }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || '密码重置失败，请重试')
      } else {
        setSuccess(true)
      }
    } catch (e) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress sx={{ color: CEYLON_ORANGE, mb: 2 }} />
        <Typography sx={{ color: isDark ? 'white' : '#1c1917' }}>
          验证重置链接中...
        </Typography>
      </Box>
    )
  }

  return (
    <>
      <Typography
        variant="h4"
        sx={{
          textAlign: 'center',
          mb: 1,
          fontWeight: 600,
          color: isDark ? 'white' : '#1c1917',
        }}
      >
        {success ? '密码重置成功' : '重置密码'}
      </Typography>

      {!success && (
        <Typography
          variant="body2"
          sx={{
            textAlign: 'center',
            mb: 3,
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          }}
        >
          请输入您的新密码
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success ? (
        <Box sx={{ textAlign: 'center' }}>
          <CheckCircle
            sx={{
              fontSize: 64,
              color: '#4caf50',
              mb: 2,
            }}
          />
          <Typography
            sx={{
              mb: 3,
              color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
            }}
          >
            您的密码已成功重置，请使用新密码登录。
          </Typography>
          <Button
            component={Link}
            href={`/${locale}/login`}
            fullWidth
            variant="contained"
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              borderRadius: 2,
            }}
          >
            前往登录
          </Button>
        </Box>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            label="新密码"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            disabled={loading || !!error}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }} />
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
              mb: 2,
              '& .MuiOutlinedInput-root': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              },
            }}
          />

          <TextField
            fullWidth
            label="确认新密码"
            type={showConfirmPassword ? 'text' : 'password'}
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            disabled={loading || !!error}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
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
            disabled={loading || !!error}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              borderRadius: 2,
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : '重置密码'}
          </Button>
        </form>
      )}

      {!success && (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography
            variant="body2"
            sx={{
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            }}
          >
            想起密码了？{' '}
            <Link
              href={`/${locale}/login`}
              style={{
                color: CEYLON_ORANGE,
                textDecoration: 'none',
              }}
            >
              立即登录
            </Link>
          </Typography>
        </Box>
      )}
    </>
  )
}

// 加载状态组件
function LoadingState() {
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'
  
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <CircularProgress sx={{ color: CEYLON_ORANGE, mb: 2 }} />
      <Typography sx={{ color: isDark ? 'white' : '#1c1917' }}>
        加载中...
      </Typography>
    </Box>
  )
}

// 主页面组件
export default function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'

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

            <Suspense fallback={<LoadingState />}>
              <ResetPasswordForm locale={locale} />
            </Suspense>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
