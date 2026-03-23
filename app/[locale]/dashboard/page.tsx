'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Container,
  InputAdornment,
} from '@mui/material'
import {
  Add,
  MoreVert,
  Settings,
  Folder,
  Delete,
  Search,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Project } from '@/types'
import MainLayout from '@/components/MainLayout'

export default function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const router = useRouter()
  const t = useTranslations()
  const { profile } = useAuthStore()
  const { getEffectiveMode } = useThemeStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setSelectedProject(project)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedProject(null)
  }

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const ownedCount = projects.filter((p) => p.owner_id === profile?.id).length
  const memberCount = Math.max(projects.length - ownedCount, 0)

  return (
    <MainLayout>
      <Box sx={{ 
        minHeight: 'calc(100vh - 56px)',
        backgroundColor: isDark ? '#0a0a0a' : '#fafafa',
      }}>
        {/* Header Section */}
        <Box sx={{ 
          p: { xs: 2, md: 3 },
          pb: 2,
          backgroundColor: isDark ? '#0c0a09' : '#ffffff',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}>
          <Container maxWidth={false}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: { xs: 'flex-start', md: 'center' }, 
              justifyContent: 'space-between',
              gap: 2,
              flexDirection: { xs: 'column', md: 'row' },
            }}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.25rem', md: '1.5rem' },
                    color: isDark ? 'white' : '#1c1917',
                    mb: 0.5,
                  }}
                >
                  所有项目
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  }}
                >
                  管理你的项目和工作空间
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Stats */}
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 3, mr: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      项目总数
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: isDark ? 'white' : '#1c1917' }}>
                      {projects.length}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      我拥有的
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: isDark ? 'white' : '#1c1917' }}>
                      {ownedCount}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      成员身份
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: isDark ? 'white' : '#1c1917' }}>
                      {memberCount}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{
                    backgroundColor: CEYLON_ORANGE,
                    '&:hover': { backgroundColor: '#A34712' },
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2,
                    py: 0.75,
                    borderRadius: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  新建项目
                </Button>
              </Box>
            </Box>

            {/* Search Bar */}
            <Box sx={{ mt: 3, maxWidth: 400 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="搜索项目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: 18, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  },
                }}
              />
            </Box>
          </Container>
        </Box>

        {/* Projects Grid */}
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Container maxWidth={false}>
            <Grid container spacing={2}>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        backgroundColor: isDark ? '#1c1917' : '#ffffff',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        boxShadow: 'none',
                        height: 140,
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Skeleton variant="text" height={28} width="60%" />
                        <Skeleton variant="text" height={16} width="80%" sx={{ mt: 1 }} />
                        <Skeleton variant="text" height={16} width="40%" sx={{ mt: 1 }} />
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : filteredProjects.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 10,
                      px: 3,
                      borderRadius: 2,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '16px',
                        backgroundColor: isDark ? 'rgba(200, 92, 27, 0.1)' : 'rgba(200, 92, 27, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                      }}
                    >
                      <Folder 
                        sx={{ 
                          fontSize: 32, 
                          color: isDark ? 'rgba(200, 92, 27, 0.6)' : 'rgba(200, 92, 27, 0.5)',
                        }} 
                      />
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: isDark ? 'white' : '#1c1917', 
                        mb: 0.5,
                        fontWeight: 600,
                      }}
                    >
                      {searchQuery ? '没有找到匹配的项目' : '还没有项目'}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', 
                        mb: 4,
                      }}
                    >
                      {searchQuery ? '尝试其他关键词搜索' : '创建你的第一个项目开始工作'}
                    </Typography>
                    {!searchQuery && (
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{
                          backgroundColor: CEYLON_ORANGE,
                          '&:hover': { backgroundColor: '#A34712' },
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3,
                          borderRadius: 2,
                        }}
                      >
                        创建项目
                      </Button>
                    )}
                  </Box>
                </Grid>
              ) : (
                filteredProjects.map((project) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={project.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: isDark ? '#1c1917' : '#ffffff',
                        borderRadius: 2,
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        boxShadow: 'none',
                        height: '100%',
                        '&:hover': {
                          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                          transform: 'translateY(-2px)',
                        },
                      }}
                      onClick={() => router.push(`/${locale}/dashboard/project/${project.id}`)}
                    >
                      <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
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
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, project)}
                            sx={{
                              color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                              p: 0.5,
                              '&:hover': {
                                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                              },
                            }}
                          >
                            <MoreVert sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>
                        
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            mb: 0.75,
                            color: isDark ? 'white' : '#1c1917',
                            fontSize: '0.95rem',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {project.name}
                        </Typography>
                        
                        <Typography
                          variant="body2"
                          sx={{
                            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                            fontSize: '0.85rem',
                            lineHeight: 1.4,
                            flex: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {project.description || '暂无描述'}
                        </Typography>
                        
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 1.5,
                            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                            fontSize: '0.75rem',
                            display: 'block',
                          }}
                        >
                          {new Date(project.created_at).toLocaleDateString(locale)} · {project.owner_id === profile?.id ? '所有者' : '成员'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Container>
        </Box>
      </Box>

      {/* Create Project Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>创建新项目</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="项目名称"
            placeholder="输入项目名称"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            margin="normal"
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            fullWidth
            label="项目描述（可选）"
            placeholder="输入项目描述"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setCreateDialogOpen(false)}
            sx={{ 
              textTransform: 'none',
              color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleCreateProject}
            variant="contained"
            disabled={!newProjectName.trim() || creating}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
            }}
          >
            {creating ? '创建中...' : '创建项目'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
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
          onClick={() => {
            if (selectedProject) {
              router.push(`/${locale}/dashboard/project/${selectedProject.id}`)
            }
            handleMenuClose()
          }}
          sx={{
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          <ListItemIcon sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
            <Folder fontSize="small" />
          </ListItemIcon>
          <ListItemText>打开项目</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedProject) {
              router.push(`/${locale}/dashboard/project/${selectedProject.id}/settings`)
            }
            handleMenuClose()
          }}
          sx={{
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          <ListItemIcon sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>设置</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => selectedProject && handleDeleteProject(selectedProject.id)}
          sx={{ 
            color: '#ef4444',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
            },
          }}
        >
          <ListItemIcon sx={{ color: '#ef4444' }}>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>删除</ListItemText>
        </MenuItem>
      </Menu>
    </MainLayout>
  )
}
