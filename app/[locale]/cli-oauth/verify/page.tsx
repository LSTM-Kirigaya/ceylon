'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material'
import { CheckCircle, Close as CloseIcon, HelpOutline } from '@mui/icons-material'

export default function CliOauthVerifyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  // In the real OAuth implementation, this comes from device code exchange.
  // For the example, we just read it from query string.
  const code = searchParams.get('code') || ''

  const [session, setSession] = useState<{ user: any } | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestInfo, setRequestInfo] = useState<null | {
    deviceCode: string
    userCode: string
    clientName: string
    scopes: string[]
    expiresAt: string
  }>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionResult, setActionResult] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        const sessRes = await fetch('/api/auth/session', { credentials: 'include' })
        const sessJson = await sessRes.json().catch(() => ({}))
        if (!mounted) return
        setSession(sessJson?.user ? { user: sessJson.user } : null)

        // Fetch request details (mock for now).
        const url = `/api/cli/oauth/verify?code=${encodeURIComponent(code)}`
        const reqRes = await fetch(url, { credentials: 'include' })
        const reqJson = await reqRes.json().catch(() => ({}))
        if (!mounted) return
        setRequestInfo(reqJson?.request ?? null)
      } catch {
        if (!mounted) return
        setRequestInfo(null)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    void run()
    return () => {
      mounted = false
    }
  }, [code])

  const scopesText = requestInfo?.scopes?.join('、') || ''

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!session?.user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Container maxWidth="sm">
          <Alert severity="info" sx={{ mb: 2 }}>
            请先登录以完成 CLI 授权
          </Alert>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <HelpOutline fontSize="small" />
                CLI 授权示例
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                登录后，你将看到请求详情，并选择是否允许。
              </Typography>
              <Button variant="contained" sx={{ backgroundColor: '#C85C1B', textTransform: 'none' }} onClick={() => router.push(`/${locale}/login`)}>
                去登录
              </Button>
            </CardContent>
          </Card>
        </Container>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #fafaf9 0%, #ffffff 100%)',
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              CLI 授权确认
            </Typography>

            {actionResult ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                {actionResult}
              </Alert>
            ) : null}

            {!requestInfo ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                无法加载授权请求（示例接口返回为空）。
              </Alert>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  请求来自：<b>{requestInfo.clientName}</b>
                </Alert>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                    校验码
                  </Typography>
                  <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                    {requestInfo.userCode || '(empty)'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                    允许的范围（scopes）
                  </Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                    {scopesText || '(none)'}
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  有效期：{new Date(requestInfo.expiresAt).toLocaleString()}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    disabled={actionLoading}
                    sx={{ flex: 1, borderRadius: 2, textTransform: 'none' }}
                    onClick={async () => {
                      setActionLoading(true)
                      try {
                        await fetch('/api/cli/oauth/verify/deny', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ code: requestInfo.userCode }),
                          credentials: 'include',
                        })
                        setActionResult('已拒绝该授权请求。')
                      } catch {
                        setActionResult('拒绝失败（示例模式）。')
                      } finally {
                        setActionLoading(false)
                      }
                    }}
                    startIcon={<CloseIcon />}
                  >
                    拒绝
                  </Button>

                  <Button
                    variant="contained"
                    disabled={actionLoading}
                    sx={{ flex: 1, borderRadius: 2, textTransform: 'none', backgroundColor: '#C85C1B' }}
                    onClick={async () => {
                      setActionLoading(true)
                      try {
                        await fetch('/api/cli/oauth/verify/approve', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ code: requestInfo.userCode }),
                          credentials: 'include',
                        })
                        setActionResult('已允许该授权请求。你可以返回 CLI 完成登录。')
                      } catch {
                        setActionResult('允许失败（示例模式）。')
                      } finally {
                        setActionLoading(false)
                      }
                    }}
                    startIcon={<CheckCircle />}
                  >
                    允许
                  </Button>
                </Box>

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button variant="text" sx={{ textTransform: 'none' }} onClick={() => router.push(`/${locale}/dashboard`)}>
                    返回控制台
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

