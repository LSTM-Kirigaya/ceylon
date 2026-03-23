'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  TextField,
  Container,
  Breadcrumbs,
  Link,
  Alert,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Save,
  PhotoCamera,
  ChevronRight,
  AccountCircle,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import MainLayout from '@/components/MainLayout'

export default function ProfilePage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations()
  const { profile, setProfile } = useAuthStore()
  const { getEffectiveMode } = useThemeStore()
  
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isDark = getEffectiveMode() === 'dark'

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setAvatarUrl(profile.avatar_url)
      setLoading(false)
    }
  }, [profile])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: '只支持 JPEG, PNG, GIF 和 WebP 格式的图片' })
      return
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setMessage({ type: 'error', text: '图片大小不能超过 5MB' })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', profile.id)

      const response = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '上传失败')
      }

      setAvatarUrl(data.url)
      
      // Update profile in store
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single()
      
      if (updatedProfile) {
        setProfile(updatedProfile)
      }

      setMessage({ type: 'success', text: '头像上传成功' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '上传失败' })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error

      // Refresh profile
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single()

      if (updatedProfile) {
        setProfile(updatedProfile)
      }

      setMessage({ type: 'success', text: '个人资料已保存' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <Container maxWidth="md" sx={{ p: 3 }}>
          <Skeleton variant="text" height={40} width={200} />
          <Skeleton variant="rectangular" height={300} sx={{ mt: 3, borderRadius: 2 }} />
        </Container>
      </MainLayout>
    )
  }

  if (!profile) {
    return (
      <MainLayout>
        <Container maxWidth="md" sx={{ p: 3 }}>
          <Alert severity="warning">请先登录</Alert>
        </Container>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ p: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs 
          separator={<ChevronRight sx={{ fontSize: 16, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} />}
          sx={{ mb: 2 }}
        >
          <Link
            href={`/${locale}/dashboard`}
            style={{
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            {t('nav.dashboard')}
          </Link>
          <Typography sx={{ color: isDark ? 'white' : '#1c1917', fontSize: '0.9rem' }}>
            {t('nav.profile')}
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: isDark ? 'white' : '#1c1917',
              fontSize: '1.75rem',
            }}
          >
            {t('nav.profile')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 0.5,
              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              fontSize: '0.95rem',
            }}
          >
            管理你的个人信息和头像
          </Typography>
        </Box>

        {message && (
          <Alert
            severity={message.type}
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Card sx={{ 
          backgroundColor: isDark ? '#1c1917' : '#ffffff',
          borderRadius: 2,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: 'none',
          overflow: 'hidden',
        }}>
          <CardContent sx={{ p: 0 }}>
            {/* Avatar Section */}
            <Box sx={{ p: 4, textAlign: 'center', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={avatarUrl || undefined}
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    backgroundColor: CEYLON_ORANGE,
                    fontSize: '3rem',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.7 : 1,
                    border: `4px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  }}
                  onClick={handleAvatarClick}
                >
                  {profile.display_name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <Tooltip title="更换头像">
                  <IconButton
                    onClick={handleAvatarClick}
                    disabled={uploading}
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: CEYLON_ORANGE,
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#A34712',
                      },
                      width: 40,
                      height: 40,
                    }}
                  >
                    <PhotoCamera />
                  </IconButton>
                </Tooltip>
              </Box>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
              />
              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                }}
              >
                {uploading ? '上传中...' : '点击头像更换照片'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  display: 'block',
                  mt: 0.5,
                }}
              >
                支持 JPG, PNG, GIF, WebP · 最大 5MB
              </Typography>
            </Box>

            {/* Profile Info Form */}
            <Box sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, color: isDark ? 'white' : '#1c1917', fontWeight: 600, fontSize: '1rem' }}>
                基本信息
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  fullWidth
                  label="邮箱"
                  value={profile.email}
                  disabled
                  helperText="邮箱地址不可修改"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />

                <TextField
                  fullWidth
                  label="昵称"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="输入你的昵称"
                  helperText="其他用户将看到你的昵称"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />

                <Box>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                      backgroundColor: CEYLON_ORANGE,
                      '&:hover': { backgroundColor: '#A34712' },
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                    }}
                  >
                    {saving ? '保存中...' : '保存修改'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </MainLayout>
  )
}
