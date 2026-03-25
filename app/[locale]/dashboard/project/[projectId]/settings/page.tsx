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
  Alert,
  Stack,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  ButtonGroup,
  Skeleton,
} from '@mui/material'
import {
  Save,
  Delete,
  Add,
  CloudUpload,
  Visibility,
  OpenInNew,
  Group,
  Close,
  Folder,
} from '@mui/icons-material'
import { apiJson } from '@/lib/client-api'
import { uploadProjectIcon } from '@/lib/storage'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Project, VersionView } from '@/types'
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
  const [projectIconUrl, setProjectIconUrl] = useState<string | null>(null)
  const [projectIconFile, setProjectIconFile] = useState<File | null>(null)
  const [projectIconPreview, setProjectIconPreview] = useState<string | null>(null)
  const [removeProjectIcon, setRemoveProjectIcon] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [versionViews, setVersionViews] = useState<VersionView[]>([])
  const [viewsLoading, setViewsLoading] = useState(true)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [newViewDesc, setNewViewDesc] = useState('')
  const [creatingView, setCreatingView] = useState(false)

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const fetchViews = async () => {
    setViewsLoading(true)
    try {
      const { views } = await apiJson<{ views: VersionView[] }>(`/api/projects/${projectId}/views`)
      setVersionViews(views ?? [])
    } catch (error) {
      console.error('Error fetching views:', error)
    } finally {
      setViewsLoading(false)
    }
  }

  const fetchProject = async () => {
    setLoading(true)
    try {
      const { project: data } = await apiJson<{ project: Project }>(`/api/projects/${projectId}`)
      setProject(data)
      setName(data.name)
      setDescription(data.description || '')
      setProjectIconUrl(data.icon_url)
      setProjectIconFile(null)
      setProjectIconPreview(null)
      setRemoveProjectIcon(false)
      await fetchViews()
    } catch (error) {
      console.error('Error fetching project:', error)
      setViewsLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateView = async () => {
    if (!newViewName.trim()) return
    setCreatingView(true)
    try {
      const { view } = await apiJson<{ view: VersionView }>(`/api/projects/${projectId}/views`, {
        method: 'POST',
        body: JSON.stringify({
          name: newViewName.trim(),
          description: newViewDesc.trim() || null,
        }),
      })
      setVersionViews((prev) => [...prev, view])
      setViewDialogOpen(false)
      setNewViewName('')
      setNewViewDesc('')
      setMessage({ type: 'success', text: t('common.success') })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('errors.generic')
      setMessage({ type: 'error', text: msg })
    } finally {
      setCreatingView(false)
    }
  }

  const handleDeleteView = async (viewId: string) => {
    if (!confirm('确定要删除该版本视图吗？其中的需求也会被删除。')) return
    try {
      await apiJson(`/api/version-views/${viewId}`, { method: 'DELETE' })
      setVersionViews((prev) => prev.filter((v) => v.id !== viewId))
      setMessage({ type: 'success', text: t('common.success') })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('errors.generic')
      setMessage({ type: 'error', text: msg })
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
      const patchBody: { name: string; description: string | null; icon_url?: string | null } = {
        name: name.trim(),
        description: description.trim() || null,
      }

      if (projectIconFile) {
        const { url, error: uploadError } = await uploadProjectIcon(projectId, projectIconFile)
        if (uploadError || !url) {
          throw uploadError ?? new Error('Upload failed')
        }
        patchBody.icon_url = url
      } else if (removeProjectIcon) {
        patchBody.icon_url = null
      }

      await apiJson(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(patchBody),
      })

      if (patchBody.icon_url !== undefined) {
        setProjectIconUrl(patchBody.icon_url)
        setProjectIconFile(null)
        setProjectIconPreview(null)
        setRemoveProjectIcon(false)
      }

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
        <Container maxWidth="lg" sx={{ p: 3 }}>
          {/* Header Skeleton */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Skeleton variant="text" height={44} width={240} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={42} width={240} sx={{ borderRadius: 2 }} />
          </Box>

          <Stack spacing={3}>
            {/* General Settings Skeleton */}
            <Card
              sx={{
                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                borderRadius: 2,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                boxShadow: 'none',
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 3, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                  <Skeleton variant="text" height={24} width={140} sx={{ borderRadius: 2 }} />
                </Box>
                <Box sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    <Skeleton variant="rectangular" height={96} width="100%" sx={{ borderRadius: 2 }} />
                    <Skeleton variant="rectangular" height={56} width="100%" sx={{ borderRadius: 2 }} />
                    <Skeleton variant="rectangular" height={140} width="100%" sx={{ borderRadius: 2 }} />
                    <Skeleton variant="rectangular" height={44} width={160} sx={{ borderRadius: 2 }} />
                  </Stack>
                </Box>
              </CardContent>
            </Card>

            {/* Version Views Skeleton */}
            <Card
              sx={{
                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                borderRadius: 2,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                boxShadow: 'none',
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Box
                  sx={{
                    p: 3,
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  <Skeleton variant="text" height={24} width={140} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={42} width={170} sx={{ borderRadius: 2 }} />
                </Box>
                <Box sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} variant="rectangular" height={74} width="100%" sx={{ borderRadius: 2 }} />
                    ))}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Container>
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
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
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
          <ButtonGroup variant="outlined">
            <Button
              startIcon={<Group />}
              onClick={() => router.push(`/${locale}/dashboard/project/${projectId}/team`)}
              sx={{ textTransform: 'none' }}
            >
              {t('project.team.title')}
            </Button>
          </ButtonGroup>
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
              </Box>
              <Box sx={{ p: 3 }}>
                <Stack spacing={3}>
                  {/* Project Icon Upload */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        backgroundColor: isDark ? 'rgba(200, 92, 27, 0.08)' : 'rgba(200, 92, 27, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {(projectIconPreview || projectIconUrl) ? (
                        <Box
                          component="img"
                          data-testid="project-icon-preview-img"
                          src={projectIconPreview || projectIconUrl || undefined}
                          alt="Project icon preview"
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Folder
                          sx={{
                            color: isDark ? 'rgba(200, 92, 27, 0.8)' : 'rgba(200, 92, 27, 0.7)',
                            fontSize: 28,
                          }}
                        />
                      )}

                      {(projectIconPreview || projectIconUrl) && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            setProjectIconFile(null)
                            setProjectIconPreview(null)
                            setProjectIconUrl(null)
                            setRemoveProjectIcon(true)
                          }}
                          disabled={saving}
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            '&:hover': {
                              backgroundColor: isDark ? '#3d3d3d' : '#f5f5f5',
                            },
                          }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', display: 'block', mb: 1 }}
                      >
                        项目头像（可选）
                      </Typography>
                      <Button
                        component="label"
                        variant="outlined"
                        disabled={saving}
                        sx={{
                          width: 120,
                          height: 44,
                          borderRadius: 2,
                          borderStyle: 'dashed',
                          borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                          color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 1,
                          '&:hover': {
                            borderColor: CEYLON_ORANGE,
                            color: CEYLON_ORANGE,
                            backgroundColor: isDark ? 'rgba(199, 78, 26, 0.1)' : 'rgba(199, 78, 26, 0.05)',
                          },
                        }}
                      >
                        <CloudUpload />
                        <Typography variant="caption">上传</Typography>
                        <input
                          data-testid="project-icon-uploader-input"
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setProjectIconFile(file)
                              setProjectIconPreview(URL.createObjectURL(file))
                              setRemoveProjectIcon(false)
                            }
                          }}
                        />
                      </Button>
                    </Box>
                  </Box>

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

          {/* Version views */}
          <Card
            sx={{
              backgroundColor: isDark ? '#1c1917' : '#ffffff',
              borderRadius: 2,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              boxShadow: 'none',
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Box
                sx={{
                  p: 3,
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Typography variant="h6" sx={{ color: isDark ? 'white' : '#1c1917', fontWeight: 600, fontSize: '1rem' }}>
                  版本视图
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setNewViewName('')
                    setNewViewDesc('')
                    setViewDialogOpen(true)
                  }}
                  sx={{
                    backgroundColor: CEYLON_ORANGE,
                    '&:hover': { backgroundColor: '#A34712' },
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                >
                  新建视图
                </Button>
              </Box>
              <Box sx={{ p: viewsLoading ? 3 : 0 }}>
                {viewsLoading ? (
                  <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    {t('common.loading')}
                  </Typography>
                ) : versionViews.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Visibility sx={{ fontSize: 40, color: isDark ? 'rgba(200, 92, 27, 0.5)' : 'rgba(200, 92, 27, 0.4)', mb: 1 }} />
                    <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                      还没有版本视图，点击「新建视图」创建
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {versionViews.map((v) => (
                      <ListItem
                        key={v.id}
                        secondaryAction={
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <IconButton
                              edge="end"
                              aria-label="打开视图"
                              onClick={() => router.push(`/${locale}/dashboard/project/${projectId}/view/${v.id}`)}
                              sx={{ color: CEYLON_ORANGE }}
                            >
                              <OpenInNew fontSize="small" />
                            </IconButton>
                            <IconButton edge="end" aria-label="删除视图" onClick={() => handleDeleteView(v.id)} sx={{ color: '#ef4444' }}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Stack>
                        }
                        sx={{
                          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                          py: 2,
                          px: 3,
                        }}
                      >
                        <ListItemText
                          primary={v.name}
                          secondary={v.description || '暂无描述'}
                          primaryTypographyProps={{
                            sx: { color: isDark ? 'white' : '#1c1917', fontWeight: 600, fontSize: '0.95rem' },
                          }}
                          secondaryTypographyProps={{
                            sx: { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', fontSize: '0.85rem' },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>

          <Dialog
            open={viewDialogOpen}
            onClose={() => !creatingView && setViewDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: { backgroundColor: isDark ? '#1c1917' : '#ffffff', borderRadius: 2 },
            }}
          >
            <DialogTitle sx={{ pb: 1 }}>新建版本视图</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="视图名称"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                margin="normal"
                autoFocus
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                fullWidth
                label="描述（可选）"
                value={newViewDesc}
                onChange={(e) => setNewViewDesc(e.target.value)}
                margin="normal"
                multiline
                rows={3}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={() => setViewDialogOpen(false)} disabled={creatingView} sx={{ textTransform: 'none' }}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateView}
                disabled={!newViewName.trim() || creatingView}
                sx={{
                  backgroundColor: CEYLON_ORANGE,
                  '&:hover': { backgroundColor: '#A34712' },
                  textTransform: 'none',
                  borderRadius: 2,
                }}
              >
                {creatingView ? t('common.loading') : t('common.create')}
              </Button>
            </DialogActions>
          </Dialog>

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
