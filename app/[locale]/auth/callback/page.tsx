'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

import { Box, CircularProgress, Typography } from '@mui/material'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const router = useRouter()

  const t = useTranslations()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth callback error:', error)
        router.push(`/${locale}/login?error=auth_callback_failed`)
        return
      }

      if (session) {
        router.push(`/${locale}/dashboard`)
      } else {
        router.push(`/${locale}/login`)
      }
    }

    handleAuthCallback()
  }, [router, locale])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography>{t('common.loading')}</Typography>
    </Box>
  )
}
