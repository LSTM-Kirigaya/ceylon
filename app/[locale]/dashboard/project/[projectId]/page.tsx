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
  Grid,
  Breadcrumbs,
  Link,
  Skeleton,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Container,
  Stack,
  Tooltip,
} from '@mui/material'
import {
  Settings,
  Group,
  Folder,
  MoreVert,
  Visibility,
  TrendingUp,
  CheckCircle,
  Schedule,
  BugReport,
  ChevronRight,
  Add,
} from '@mui/icons-material'
import { apiJson } from '@/lib/client-api'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Project, VersionView } from '@/types'
import MainLayout from '@/components/MainLayout'

export default function ProjectOverviewPage({ params }: { params: Promise<{ locale: string; projectId: string }> }) {
  const { locale, projectId } = use(params)
  const router = useRouter()
  const t = useTranslations()
  const { profile } = useAuthStore()
  const { getEffectiveMode } = useThemeStore()
  
  const [project, setProject] = useState<Project | null>(null)
  const [versionViews, setVersionViews] = useState<VersionView[]>([])
  const [loading, setLoading] = useState(true)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [stats, setStats] = useState({
    totalRequirements: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    bugs: 0,
  })

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId])

  const fetchProjectData = async () => {
    setLoading(true)
    try {
      const { project: projectData } = await apiJson<{ project: Project }>(
        `/api/projects/${projectId}`
      )
      setProject(projectData)

      const { views: viewsData } = await apiJson<{ views: VersionView[] }>(
        `/api/projects/${projectId}/views`
      )
      setVersionViews(viewsData || [])

      const { stats: s } = await apiJson<{
        stats: {
          totalRequirements: number
          completed: number
          inProgress: number
          pending: number
          bugs: number
        }
      }>(`/api/projects/${projectId}/stats`)
      setStats({
        totalRequirements: s.totalRequirements,
        completed: s.completed,
        inProgress: s.inProgress,
        pending: s.pending,
        bugs: s.bugs,
      })
    } catch (error) {
      console.error('Error fetching project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isOwner = project?.owner_id === profile?.id

  const statCards = [
    { label: '总需求', value: stats.totalRequirements, icon: Folder, color: CEYLON_ORANGE, bgColor: isDark ? 'rgba(200, 92, 27, 0.15)' : 'rgba(200, 92, 27, 0.08)' },
    { label: '已完成', value: stats.completed, icon: CheckCircle, color: '#22c55e', bgColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.08)' },
    { label: '进行中', value: stats.inProgress, icon: Schedule, color: '#3b82f6', bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)' },
    { label: 'Bug', value: stats.bugs, icon: BugReport, color: '#ef4444', bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)' },
  ]

  if (loading) {
    return (
      <MainLayout>
        <Container maxWidth="lg" sx={{ p: 3 }}>
          <Skeleton variant="text" height={40} width={200} />
          <Skeleton variant="text" height={20} width={300} sx={{ mt: 1 }} />
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {[...Array(4)].map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </MainLayout>
    )
  }

  if (!project) {
    return (
      <MainLayout>
        <Container maxWidth="lg" sx={{ p: 3 }}>
          <Typography>{t('errors.notFound')}</Typography>
        </Container>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ p: 3 }}>
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
            {project.name}
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Project Icon */}
              {project.icon_url ? (
                <Box
                  component="img"
                  src={project.icon_url}
                  alt={project.name}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: isDark ? 'rgba(200, 92, 27, 0.12)' : 'rgba(200, 92, 27, 0.08)',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Folder 
                    sx={{ 
                      color: isDark ? 'rgba(200, 92, 27, 0.8)' : 'rgba(200, 92, 27, 0.7)',
                      fontSize: 22,
                    }} 
                  />
                </Box>
              )}
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  color: isDark ? 'white' : '#1c1917',
                  fontSize: { xs: '1.5rem', md: '1.75rem' },
                }}
              >
                {project.name}
              </Typography>
              <Tooltip title="更多操作">
                <IconButton
                  onClick={(e) => setMenuAnchorEl(e.currentTarget)}
                  sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                >
                  <MoreVert />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography
              variant="body1"
              sx={{
                mt: 0.5,
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                fontSize: '0.95rem',
              }}
            >
              {project.description || t('dashboard.projectCard.noDescription')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<Group />}
              onClick={() => router.push(`/${locale}/dashboard/project/${projectId}/team`)}
              sx={{
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                color: isDark ? 'white' : '#1c1917',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                },
              }}
            >
              {t('project.team.title')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={() => router.push(`/${locale}/dashboard/project/${projectId}/settings`)}
              sx={{
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                color: isDark ? 'white' : '#1c1917',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                },
              }}
            >
              {t('common.settings')}
            </Button>
          </Stack>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 5 }}>
          {statCards.map((stat) => (
            <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
              <Card sx={{ 
                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                borderRadius: 2,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                boxShadow: 'none',
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        backgroundColor: stat.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <stat.icon sx={{ color: stat.color, fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          color: isDark ? 'white' : '#1c1917', 
                          fontWeight: 700,
                          fontSize: '1.5rem',
                          lineHeight: 1.2,
                        }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                          fontSize: '0.85rem',
                        }}
                      >
                        {stat.label}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Version Views */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ color: isDark ? 'white' : '#1c1917', fontWeight: 600, fontSize: '1.25rem' }}>
              版本视图
            </Typography>
            <Button
              variant="text"
              startIcon={<Add />}
              onClick={() => router.push(`/${locale}/dashboard/project/${projectId}/settings`)}
              sx={{
                color: CEYLON_ORANGE,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              新建视图
            </Button>
          </Box>
          
          {versionViews.length === 0 ? (
            <Card sx={{ 
              backgroundColor: isDark ? '#1c1917' : '#ffffff', 
              p: 4, 
              textAlign: 'center',
              borderRadius: 2,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              boxShadow: 'none',
            }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  backgroundColor: isDark ? 'rgba(200, 92, 27, 0.1)' : 'rgba(200, 92, 27, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Visibility sx={{ fontSize: 32, color: isDark ? 'rgba(200, 92, 27, 0.6)' : 'rgba(200, 92, 27, 0.5)' }} />
              </Box>
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600, mb: 0.5 }}>
                还没有版本视图
              </Typography>
              <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                在设置中创建你的第一个版本视图
              </Typography>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {versionViews.map((view) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={view.id}>
                  <Card
                    sx={{
                      backgroundColor: isDark ? '#1c1917' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      borderRadius: 2,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      boxShadow: 'none',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                      },
                    }}
                    onClick={() => router.push(`/${locale}/dashboard/project/${projectId}/view/${view.id}`)}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            backgroundColor: isDark ? 'rgba(200, 92, 27, 0.12)' : 'rgba(200, 92, 27, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Visibility sx={{ color: isDark ? 'rgba(200, 92, 27, 0.8)' : 'rgba(200, 92, 27, 0.7)', fontSize: 20 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: isDark ? 'white' : '#1c1917', 
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              mb: 0.5,
                            }}
                          >
                            {view.name}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                              fontSize: '0.85rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {view.description || '暂无描述'}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Project Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
          PaperProps={{
            sx: {
              backgroundColor: isDark ? '#1c1917' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              boxShadow: isDark 
                ? '0 4px 20px rgba(0,0,0,0.5)' 
                : '0 4px 20px rgba(0,0,0,0.1)',
              minWidth: 160,
            },
          }}
        >
          <MenuItem 
            onClick={() => { router.push(`/${locale}/dashboard/project/${projectId}/settings`); setMenuAnchorEl(null) }}
            sx={{
              color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
              fontSize: '0.9rem',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <ListItemIcon sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
              <Settings fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('common.settings')}</ListItemText>
          </MenuItem>
          <MenuItem 
            onClick={() => { router.push(`/${locale}/dashboard/project/${projectId}/team`); setMenuAnchorEl(null) }}
            sx={{
              color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
              fontSize: '0.9rem',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <ListItemIcon sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
              <Group fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('project.team.title')}</ListItemText>
          </MenuItem>
        </Menu>
      </Container>
    </MainLayout>
  )
}
