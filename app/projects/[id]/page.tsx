'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Breadcrumbs,
  Link,
} from '@mui/material'
import {
  Add,
  MoreVert,
  ArrowBack,
  Settings,
  Group,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Project, VersionView } from '@/types'
import MainLayout from '@/components/MainLayout'
import RequirementsTable from '@/components/requirements/RequirementsTable'

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { getEffectiveMode } = useThemeStore()
  
  const [project, setProject] = useState<Project | null>(null)
  const [versionViews, setVersionViews] = useState<VersionView[]>([])
  const [activeView, setActiveView] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [newViewDesc, setNewViewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)

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
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch version views
      const { data: viewsData, error: viewsError } = await supabase
        .from('version_views')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (viewsError) throw viewsError
      setVersionViews(viewsData || [])
      
      // Set first view as active if exists
      if (viewsData && viewsData.length > 0 && !activeView) {
        setActiveView(viewsData[0].id)
      }
    } catch (error) {
      console.error('Error fetching project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateView = async () => {
    if (!newViewName.trim()) return

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('version_views')
        .insert({
          project_id: projectId,
          name: newViewName.trim(),
          description: newViewDesc.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      setVersionViews([...versionViews, data])
      setActiveView(data.id)
      setCreateDialogOpen(false)
      setNewViewName('')
      setNewViewDesc('')
    } catch (error) {
      console.error('Error creating version view:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteView = async (viewId: string) => {
    try {
      const { error } = await supabase
        .from('version_views')
        .delete()
        .eq('id', viewId)

      if (error) throw error

      const updatedViews = versionViews.filter(v => v.id !== viewId)
      setVersionViews(updatedViews)
      
      if (activeView === viewId && updatedViews.length > 0) {
        setActiveView(updatedViews[0].id)
      } else if (updatedViews.length === 0) {
        setActiveView(null)
      }
    } catch (error) {
      console.error('Error deleting version view:', error)
    }
    setMenuAnchorEl(null)
  }

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ p: 4 }}>
          <Typography>加载中...</Typography>
        </Box>
      </MainLayout>
    )
  }

  if (!project) {
    return (
      <MainLayout>
        <Box sx={{ p: 4 }}>
          <Typography>项目不存在</Typography>
        </Box>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Box sx={{ p: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            href="/dashboard"
            style={{
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              textDecoration: 'none',
            }}
          >
            控制台
          </Link>
          <Typography sx={{ color: isDark ? 'white' : '#1c1917' }}>
            {project.name}
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: isDark ? 'white' : '#1c1917',
              }}
            >
              {project.name}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mt: 0.5,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              }}
            >
              {project.description || '暂无描述'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Group />}
              onClick={() => router.push(`/projects/${projectId}/team`)}
              sx={{
                borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                color: isDark ? 'white' : '#1c1917',
              }}
            >
              团队
            </Button>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={() => router.push(`/projects/${projectId}/settings`)}
              sx={{
                borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                color: isDark ? 'white' : '#1c1917',
              }}
            >
              设置
            </Button>
          </Box>
        </Box>

        {/* Version Views Tabs */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 3,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          }}
        >
          <Tabs
            value={activeView || false}
            onChange={(_, value) => setActiveView(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flex: 1,
              '& .MuiTabs-indicator': {
                backgroundColor: CEYLON_ORANGE,
              },
            }}
          >
            {versionViews.map((view) => (
              <Tab
                key={view.id}
                value={view.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {view.name}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuAnchorEl(e.currentTarget)
                      }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Box>
                }
                sx={{
                  color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                  '&.Mui-selected': {
                    color: CEYLON_ORANGE,
                  },
                }}
              />
            ))}
          </Tabs>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
              mb: 1,
            }}
          >
            新建视图
          </Button>
        </Box>

        {/* Requirements Table */}
        {activeView ? (
          <RequirementsTable
            versionViewId={activeView}
            projectId={projectId}
          />
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              backgroundColor: isDark ? '#1c1917' : '#ffffff',
              borderRadius: 4,
            }}
          >
            <Typography variant="h6" sx={{ color: isDark ? 'white' : '#1c1917', mb: 2 }}>
              还没有版本视图
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', mb: 3 }}>
              创建一个版本视图来管理需求
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                backgroundColor: CEYLON_ORANGE,
                '&:hover': { backgroundColor: '#A34712' },
              }}
            >
              新建视图
            </Button>
          </Box>
        )}
      </Box>

      {/* Create View Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建版本视图</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="视图名称"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            margin="normal"
            autoFocus
            placeholder="例如：v1.0"
          />
          <TextField
            fullWidth
            label="描述（可选）"
            value={newViewDesc}
            onChange={(e) => setNewViewDesc(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleCreateView}
            variant="contained"
            disabled={!newViewName.trim() || creating}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
            }}
          >
            {creating ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            if (activeView) handleDeleteView(activeView)
          }}
          sx={{ color: 'error.main' }}
        >
          删除视图
        </MenuItem>
      </Menu>
    </MainLayout>
  )
}
