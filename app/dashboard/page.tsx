'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Skeleton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  Add,
  MoreVert,
  Settings,
  Logout,
  Folder,
  Edit,
  Delete,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Project } from '@/types'
import MainLayout from '@/components/MainLayout'

export default function DashboardPage() {
  const router = useRouter()
  const { profile, signOut } = useAuthStore()
  const { getEffectiveMode } = useThemeStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .order('created_at', { ascending: false })

      const allProjects = [
        ...(ownedProjects || []),
        ...(memberProjects?.map(m => m.projects) || []),
      ]

      // Remove duplicates
      const uniqueProjects = allProjects.filter(
        (project, index, self) =>
          index === self.findIndex(p => p.id === project.id)
      )

      setProjects(uniqueProjects)
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    setCreating(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || null,
          owner_id: userData.user.id,
        })
        .select()
        .single()

      if (error) throw error

      setProjects([data, ...projects])
      setCreateDialogOpen(false)
      setNewProjectName('')
      setNewProjectDesc('')
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      setProjects(projects.filter(p => p.id !== projectId))
    } catch (error) {
      console.error('Error deleting project:', error)
    }
    setAnchorEl(null)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    setAnchorEl(event.currentTarget)
    setSelectedProject(project)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedProject(null)
  }

  return (
    <MainLayout>
      <Box sx={{ p: 4 }}>
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
              我的项目
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mt: 0.5,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              }}
            >
              管理您的所有项目
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
            }}
          >
            新建项目
          </Button>
        </Box>

        <Grid container spacing={3}>
          {loading ? (
            [...Array(6)].map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Card
                  sx={{
                    borderRadius: 3,
                    backgroundColor: isDark ? '#1c1917' : '#ffffff',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    boxShadow: 'none',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Skeleton variant="text" height={40} />
                    <Skeleton variant="text" height={20} />
                    <Skeleton variant="text" height={20} width="60%" />
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : projects.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  textAlign: 'center',
                  py: 10,
                  px: 4,
                  borderRadius: 3,
                  backgroundColor: isDark ? 'rgba(28, 25, 23, 0.5)' : 'rgba(250, 250, 249, 0.8)',
                  border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '20px',
                    backgroundColor: isDark ? 'rgba(200, 92, 27, 0.1)' : 'rgba(200, 92, 27, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                  }}
                >
                  <Folder 
                    sx={{ 
                      fontSize: 40, 
                      color: isDark ? 'rgba(200, 92, 27, 0.6)' : 'rgba(200, 92, 27, 0.5)',
                    }} 
                  />
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: isDark ? 'white' : '#1c1917', 
                    mb: 1,
                    fontWeight: 600,
                  }}
                >
                  还没有项目
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', 
                    mb: 4,
                    maxWidth: 400,
                  }}
                >
                  创建您的第一个项目开始使用锡兰管理需求
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{
                    backgroundColor: CEYLON_ORANGE,
                    '&:hover': { backgroundColor: '#A34712' },
                    px: 4,
                    py: 1,
                    borderRadius: 2,
                    fontWeight: 600,
                  }}
                >
                  新建项目
                </Button>
              </Box>
            </Grid>
          ) : (
            projects.map((project) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    backgroundColor: isDark ? '#1c1917' : '#ffffff',
                    borderRadius: 3,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    boxShadow: isDark 
                      ? '0 2px 8px rgba(0,0,0,0.2)' 
                      : '0 2px 8px rgba(0,0,0,0.04)',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: isDark
                        ? '0 8px 24px rgba(0,0,0,0.4)'
                        : '0 12px 32px rgba(0,0,0,0.1)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    },
                  }}
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          backgroundColor: isDark ? 'rgba(200, 92, 27, 0.15)' : 'rgba(200, 92, 27, 0.08)',
                          borderRadius: 2.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Folder 
                          sx={{ 
                            color: isDark ? 'rgba(200, 92, 27, 0.8)' : 'rgba(200, 92, 27, 0.7)',
                            fontSize: 24,
                          }} 
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMenuOpen(e, project)
                        }}
                        sx={{
                          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                          '&:hover': {
                            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          },
                        }}
                      >
                        <MoreVert sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        color: isDark ? 'white' : '#1c1917',
                        fontSize: '1.1rem',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {project.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                        mb: 2.5,
                        minHeight: 40,
                        lineHeight: 1.6,
                        fontSize: '0.9rem',
                      }}
                    >
                      {project.description || '暂无描述'}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                        fontSize: '0.8rem',
                      }}
                    >
                      创建于 {new Date(project.created_at).toLocaleDateString('zh-CN')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Box>

      {/* Create Project Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建项目</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="项目名称"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            margin="normal"
            autoFocus
          />
          <TextField
            fullWidth
            label="项目描述（可选）"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleCreateProject}
            variant="contained"
            disabled={!newProjectName.trim() || creating}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
            }}
          >
            {creating ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedProject) {
              router.push(`/projects/${selectedProject.id}`)
            }
            handleMenuClose()
          }}
        >
          <ListItemIcon>
            <Folder fontSize="small" />
          </ListItemIcon>
          <ListItemText>打开</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedProject) {
              router.push(`/projects/${selectedProject.id}/settings`)
            }
            handleMenuClose()
          }}
        >
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>设置</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => selectedProject && handleDeleteProject(selectedProject.id)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>删除</ListItemText>
        </MenuItem>
      </Menu>
    </MainLayout>
  )
}
