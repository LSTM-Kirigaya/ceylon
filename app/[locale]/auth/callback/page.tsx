'use client'

import { useEffect } from 'react'

import { Box, CircularProgress, Typography } from '@mui/material'
import { useTranslations } from 'next-intl'

/**
 * OAuth / email link: forwards ?code= to the server route which sets session cookies.
 * Configure Supabase redirect URL to: {origin}/api/auth/callback
 * Legacy /auth/callback hits this page first; we forward the query string.
 */
export default function AuthCallbackPage() {
  const t = useTranslations()

  useEffect(() => {
    const q = typeof window !== 'undefined' ? window.location.search : ''
    window.location.replace(`/api/auth/callback${q}`)
  }, [])

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
