'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Box, Typography, Paper, Skeleton, Stack } from '@mui/material'
import { Visibility } from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'

type AnalyticsResponse = {
  totalViews: number
  todayViews: number
  last7Days: { date: string; count: number }[]
}

export default function AdminOverviewPage() {
  const t = useTranslations('admin.overview')
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/analytics', { credentials: 'include' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(body.error || 'Failed to load')
          return
        }
        if (!cancelled) setData(body as AnalyticsResponse)
      } catch {
        if (!cancelled) setError('Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const max = Math.max(1, ...(data?.last7Days.map((d) => d.count) ?? [0]))

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        {t('heading')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
        {t('subtitle')}
      </Typography>

      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Paper
            sx={{
              p: 2,
              flex: 1,
              backgroundColor: isDark ? '#1c1917' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 2,
              boxShadow: 'none',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Visibility fontSize="small" sx={{ opacity: 0.7 }} />
              <Typography variant="subtitle2" color="text.secondary">
                {t('totalViews')}
              </Typography>
            </Stack>
            {data ? (
              <Typography variant="h4" fontWeight={700}>
                {data.totalViews}
              </Typography>
            ) : (
              <Skeleton width={80} height={40} />
            )}
          </Paper>
          <Paper
            sx={{
              p: 2,
              flex: 1,
              backgroundColor: isDark ? '#1c1917' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 2,
              boxShadow: 'none',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Visibility fontSize="small" sx={{ opacity: 0.7 }} />
              <Typography variant="subtitle2" color="text.secondary">
                {t('todayViews')}
              </Typography>
            </Stack>
            {data ? (
              <Typography variant="h4" fontWeight={700}>
                {data.todayViews}
              </Typography>
            ) : (
              <Skeleton width={80} height={40} />
            )}
          </Paper>
        </Stack>
      )}

      <Paper
        sx={{
          p: 2,
          backgroundColor: isDark ? '#1c1917' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 2,
          boxShadow: 'none',
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {t('last7Days')}
        </Typography>
        {data ? (
          <Stack spacing={1}>
            {data.last7Days.map((row) => (
              <Box key={row.date}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {row.date}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {row.count}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${(row.count / max) * 100}%`,
                      background: 'linear-gradient(90deg, #c2410c, #ea580c)',
                      borderRadius: 1,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        ) : (
          <Skeleton variant="rectangular" height={120} />
        )}
      </Paper>
    </Box>
  )
}
