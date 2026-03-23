'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Breadcrumbs,
  Link,
  Divider,
  Alert,
  Stack,
  Container,
} from '@mui/material'
import {
  Save,
  Delete,
  Settings as SettingsIcon,
  ChevronRight,
} from '@mui/icons-material'
import { apiJson } from '@/lib/client-api'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Project } from '@/types'
import MainLayout from '@/components/MainLayout'

export default function ProjectSettingsPage({ params }: { params: Promise<{ locale: string; projectId: string }> }) {
  const { locale, projectId } = use(params)
  const router = useRouter()
  const t = useTranslations()
  const { profile } = useAuthStore()
  const { getEffectiveMode } = useThemeStore()
  
  const [project, setProject] = useState<Project | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const fetchProject = async () => {
    setLoading(true)
    try {
      const { project: data } = await apiJson<{ project: Project }>(`/api/projects/${projectId}`)
      setProject(data)
      setName(data.name)
      setDescription(data.description || '')
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: t('errors.generic') })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      await apiJson(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      })

      setMessage({ type: 'success', text: t('common.success') })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('errors.generic') })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('project.settings.danger.confirmDelete'))) {
      return
    }

    setDeleting(true)
    try {
      await apiJson(`/api/projects/${projectId}`, { method: 'DELETE' })

      router.push(`/${locale}/dashboard`)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('errors.generic') })
      setDeleting(false)
    }
  }

  const isOwner = project?.owner_id === profile?.id

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Typography>{t('common.loading')}</Typography>
        </Box>
      </MainLayout>
    )
  }

  if (!project) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Typography>{t('errors.notFound')}</Typography>
        </Box>
      </MainLayout>
    )
  }

  if (!isOwner) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="warning">
            {t('errors.forbidden')}
          </Alert>
        </Box>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ p: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs 
          separator={<ChevronRight sx={{ fontSize: 16, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} />}
          sx={{ mb: 3 }}
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
          <Link
            href={`/${locale}/dashboard/project/${projectId}`}
            style={{
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            {project.name}
          </Link>
          <Typography sx={{ color: isDark ? 'white' : '#1c1917', fontSize: '0.9rem' }}>
            {t('common.settings')}
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
            {t('project.settings.title')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 0.5,
              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              fontSize: '0.95rem',
            }}
          >
            管理项目的基本信息和设置
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

        <Stack spacing={3}>
          {/* General Settings */}
          <Card sx={{ 
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
            borderRadius: 2,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            boxShadow: 'none',
            overflow: 'hidden',
          }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                <Typography variant="h6" sx={{ color: isDark ? 'white' : '#1c1917', fontWeight: 600, fontSize: '1rem' }}>
                  基本信息
                </Typography>
                <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', mt: 0.5 }}>
                  更新项目的名称和描述
                </Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label={t('project.settings.general.name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label={t('project.settings.general.description')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={4}
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
                      {saving ? t('common.loading') : t('project.settings.general.save')}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card sx={{ 
            backgroundColor: isDark ? '#1c1917' : '#ffffff', 
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'}`,
            borderRadius: 2,
            boxShadow: 'none',
            overflow: 'hidden',
          }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, borderBottom: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'}` }}>
                <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 600, fontSize: '1rem' }}>
                  {t('project.settings.danger.title')}
                </Typography>
                <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', mt: 0.5 }}>
                  删除项目将无法恢复，请谨慎操作
                </Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ color: isDark ? 'white' : '#1c1917', fontWeight: 600, fontSize: '0.95rem' }}>
                      {t('project.settings.danger.delete')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: '0.85rem' }}>
                      删除项目及其所有相关数据
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={handleDelete}
                    disabled={deleting}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    {deleting ? t('common.loading') : t('project.settings.danger.delete')}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </MainLayout>
  )
}
