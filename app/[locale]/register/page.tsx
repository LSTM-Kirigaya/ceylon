'use client'

import { useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
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
  Avatar,
  Stepper,
  Step,
  StepLabel,
  Chip,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  PhotoCamera,
  CheckCircle,
  MarkEmailRead,
  Login,
} from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const router = useRouter()
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const [activeStep, setActiveStep] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [registeredUser, setRegisteredUser] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const schema = yup.object({
    email: yup
      .string()
      .required(t('auth.register.errors.emailRequired'))
      .email(t('auth.register.errors.emailInvalid')),
    password: yup
      .string()
      .required(t('auth.register.errors.passwordRequired'))
      .min(8, t('auth.register.errors.passwordMin'))
      .matches(/[a-zA-Z]/, t('auth.register.errors.passwordLetter'))
      .matches(/[0-9]/, t('auth.register.errors.passwordNumber')),
    confirmPassword: yup
      .string()
      .required(t('auth.register.errors.confirmRequired'))
      .oneOf([yup.ref('password')], t('auth.register.errors.confirmMismatch')),
    displayName: yup.string().required(t('auth.register.errors.displayNameRequired')),
  })

  type RegisterFormData = yup.InferType<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
  })

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const steps = [
    t('auth.register.steps.basic'),
    t('auth.register.steps.avatar'),
    t('auth.register.steps.complete'),
  ]

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError(t('auth.register.errors.avatarSize'))
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null

    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${userId}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName,
          },
        },
      })

      if (signUpError) {
        throw signUpError
      }

      if (authData.user) {
        setRegisteredUser(authData.user)
        setActiveStep(1)
      }
    } catch (err: any) {
      setError(err.message || t('auth.register.errors.registerFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!registeredUser) return

    setLoading(true)
    setError(null)

    try {
      let avatarUrl = null
      if (avatarFile) {
        avatarUrl = await uploadAvatar(registeredUser.id)
      }

      if (avatarUrl) {
        await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', registeredUser.id)
      }

      setActiveStep(2)
    } catch (err: any) {
      setError(err.message || t('auth.register.errors.uploadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label={t('auth.register.email')}
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
              label={t('auth.register.displayName')}
              margin="normal"
              {...register('displayName')}
              error={!!errors.displayName}
              helperText={errors.displayName?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} />
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
              label={t('auth.register.password')}
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

            <TextField
              fullWidth
              label={t('auth.register.confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              margin="normal"
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} />
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
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                {t('auth.register.passwordRequirements')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={t('auth.register.passwordRules.length')}
                  color={getValues('password')?.length >= 8 ? 'success' : 'default'}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={t('auth.register.passwordRules.letter')}
                  color={/[a-zA-Z]/.test(getValues('password') || '') ? 'success' : 'default'}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={t('auth.register.passwordRules.number')}
                  color={/[0-9]/.test(getValues('password') || '') ? 'success' : 'default'}
                  variant="outlined"
                />
              </Box>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 2,
                backgroundColor: CEYLON_ORANGE,
                '&:hover': { backgroundColor: '#A34712' },
                py: 1.5,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                t('common.next')
              )}
            </Button>
          </form>
        )

      case 1:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 3, color: isDark ? 'white' : '#1c1917' }}>
              {t('auth.register.avatar.title')}
            </Typography>
            
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
              <Avatar
                src={avatarPreview || undefined}
                sx={{
                  width: 120,
                  height: 120,
                  fontSize: 48,
                  backgroundColor: CEYLON_ORANGE,
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {getValues('displayName')?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: CEYLON_ORANGE,
                  '&:hover': { backgroundColor: '#A34712' },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <PhotoCamera sx={{ color: 'white' }} />
              </IconButton>
              <input
                type="file"
                hidden
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </Box>

            <Typography
              variant="body2"
              sx={{
                mb: 3,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              }}
            >
              {t('auth.register.avatar.description')}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setActiveStep(2)}
                sx={{
                  borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  color: isDark ? 'white' : '#1c1917',
                }}
              >
                {t('common.skip')}
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={handleComplete}
                disabled={loading}
                sx={{
                  backgroundColor: CEYLON_ORANGE,
                  '&:hover': { backgroundColor: '#A34712' },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  t('common.done')
                )}
              </Button>
            </Box>
          </Box>
        )

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, color: isDark ? 'white' : '#1c1917' }}>
              {t('auth.register.success.title')}
            </Typography>
            
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3, 
                textAlign: 'left',
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {t('auth.register.success.verifyTitle')}
              </Typography>
              <Typography variant="body2">
                {t('auth.register.success.verifyMessage', { email: getValues('email') })}
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<Login />}
                onClick={() => router.push(`/${locale}/login`)}
                sx={{
                  backgroundColor: CEYLON_ORANGE,
                  '&:hover': { backgroundColor: '#A34712' },
                  py: 1.5,
                }}
              >
                {t('auth.register.success.goToLogin')}
              </Button>
              
              <Button
                variant="outlined"
                fullWidth
                startIcon={<MarkEmailRead />}
                onClick={async () => {
                  try {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email: getValues('email'),
                    })
                    if (error) throw error
                    alert(t('auth.register.success.resendSuccess'))
                  } catch (err: any) {
                    alert(err.message || t('errors.generic'))
                  }
                }}
                sx={{
                  borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  color: isDark ? 'white' : '#1c1917',
                }}
              >
                {t('auth.register.success.resendEmail')}
              </Button>
            </Box>

            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                mt: 3,
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              }}
            >
              {t('auth.register.success.spamTip')}
            </Typography>
          </Box>
        )

      default:
        return null
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
                {t('auth.register.title')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mt: 1,
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                }}
              >
                {t('auth.register.subtitle')}
              </Typography>
            </Box>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {renderStepContent()}

            {activeStep === 0 && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  }}
                >
                  {t('auth.register.hasAccount')}{' '}
                  <Link
                    href={`/${locale}/login`}
                    style={{
                      color: CEYLON_ORANGE,
                      textDecoration: 'none',
                    }}
                  >
                    {t('auth.register.loginNow')}
                  </Link>
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
