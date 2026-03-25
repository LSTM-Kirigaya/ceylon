'use client'

import { useEffect, useState, use } from 'react'

import { useTranslations } from 'next-intl'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Container,
  Tooltip,
  Skeleton,
  Alert,
} from '@mui/material'
import {
  Add,
  Delete,
  Person,
} from '@mui/icons-material'
import { apiJson } from '@/lib/client-api'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Project, ProjectMember, Profile } from '@/types'
import MainLayout from '@/components/MainLayout'
import UserSearch from '@/components/UserSearch'

export default function TeamPage({ params }: { params: Promise<{ locale: string; projectId: string }> }) {
  const { locale, projectId } = use(params)
  const t = useTranslations()
  const { profile, user } = useAuthStore()
  const { getEffectiveMode } = useThemeStore()
  
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [inviteRole, setInviteRole] = useState<'read' | 'write' | 'admin'>('read')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { project: projectData } = await apiJson<{ project: Project }>(
        `/api/projects/${projectId}`
      )
      setProject(projectData)

      const { members: membersData } = await apiJson<{
        members: (ProjectMember & { profile?: Profile | Profile[] | null })[]
      }>(`/api/projects/${projectId}/members`)

      setMembers(
        (membersData ?? []).map((m) => ({
          ...m,
          profile: Array.isArray(m.profile) ? m.profile[0] : m.profile ?? undefined,
        }))
      )
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!selectedUser) {
      setError('请先选择要邀请的用户')
      return
    }

    setInviting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Check if user is already a member
      const existingMember = members.find(m => m.user_id === selectedUser.id)
      if (existingMember) {
        setError('该用户已经是项目成员')
        setInviting(false)
        return
      }

      // Check if user is the owner
      if (project?.owner_id === selectedUser.id) {
        setError('该用户是项目所有者')
        setInviting(false)
        return
      }

      await apiJson(`/api/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: selectedUser.id,
          role: inviteRole,
        }),
      })

      await fetchData()
      setSuccessMessage(`已成功邀请 ${selectedUser.display_name || selectedUser.email}`)
      
      // Reset form after a delay
      setTimeout(() => {
        setInviteDialogOpen(false)
        setSelectedUser(null)
        setInviteRole('read')
        setSuccessMessage(null)
      }, 1500)
    } catch (error: any) {
      setError(error.message || t('errors.generic'))
    } finally {
      setInviting(false)
    }
  }

  const handleCloseDialog = () => {
    setInviteDialogOpen(false)
    setSelectedUser(null)
    setInviteRole('read')
    setError(null)
    setSuccessMessage(null)
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      await apiJson(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' })
      await fetchData()
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: 'read' | 'write' | 'admin') => {
    try {
      await apiJson(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      })
      await fetchData()
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'read': return t('project.team.role.viewer')
      case 'write': return t('project.team.role.editor')
      case 'admin': return t('project.team.role.admin')
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'read': return '#6b7280'
      case 'write': return '#3b82f6'
      case 'admin': return '#22c55e'
      default: return '#6b7280'
    }
  }

  const currentUserId = profile?.id ?? user?.id
  const isOwner = project?.owner_id === currentUserId
  const currentUserMember = members.find(m => m.user_id === currentUserId)
  // 已登录即可显示邀请入口；具体能否写入由后端校验。
  const canManage = Boolean(currentUserId)

  if (loading) {
    return (
      <MainLayout>
        <Container maxWidth="lg" sx={{ p: 3 }}>
          <Skeleton variant="text" height={40} width={200} />
          <Skeleton variant="text" height={20} width={300} sx={{ mt: 1 }} />
          <Skeleton variant="rectangular" height={200} sx={{ mt: 3, borderRadius: 2 }} />
        </Container>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: isDark ? 'white' : '#1c1917',
                fontSize: { xs: '1.5rem', md: '1.75rem' },
              }}
            >
              {t('project.team.title')}
            </Typography>
          </Box>
          {canManage && (
            <Button
              variant="contained"
              startIcon={<Add />}
              data-testid="team-open-invite"
              onClick={() => setInviteDialogOpen(true)}
              sx={{
                backgroundColor: CEYLON_ORANGE,
                '&:hover': { backgroundColor: '#A34712' },
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
              }}
            >
              {t('project.team.invite')}
            </Button>
          )}
        </Box>

        {/* Members Table */}
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
                团队成员 ({members.length})
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600, fontSize: '0.8rem', py: 2 }}>
                      成员
                    </TableCell>
                    <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600, fontSize: '0.8rem', py: 2 }}>
                      角色
                    </TableCell>
                    <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600, fontSize: '0.8rem', py: 2 }}>
                      加入时间
                    </TableCell>
                    {canManage && (
                      <TableCell align="center" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600, fontSize: '0.8rem', py: 2 }}>
                        操作
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 4 : 3} align="center" sx={{ py: 6 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', mb: 0.5 }}>
                            暂无团队成员
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow 
                        key={member.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                          },
                        }}
                      >
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                              src={member.profile?.avatar_url || undefined}
                              sx={{ 
                                width: 36, 
                                height: 36,
                                backgroundColor: CEYLON_ORANGE,
                                fontSize: '0.85rem',
                              }}
                            >
                              {member.profile?.display_name?.[0] || member.profile?.email?.[0]}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ color: isDark ? 'white' : '#1c1917', fontWeight: 500, fontSize: '0.9rem' }}
                              >
                                {member.profile?.display_name || member.profile?.email?.split('@')[0]}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: '0.75rem' }}
                              >
                                {member.profile?.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          {canManage ? (
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <Select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(member.id, e.target.value as any)}
                                sx={{
                                  color: getRoleColor(member.role),
                                  fontSize: '0.85rem',
                                  borderRadius: 1.5,
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: `${getRoleColor(member.role)}40`,
                                  },
                                }}
                              >
                                <MenuItem value="read" sx={{ fontSize: '0.85rem' }}>{t('project.team.role.viewer')}</MenuItem>
                                <MenuItem value="write" sx={{ fontSize: '0.85rem' }}>{t('project.team.role.editor')}</MenuItem>
                                <MenuItem value="admin" sx={{ fontSize: '0.85rem' }}>{t('project.team.role.admin')}</MenuItem>
                              </Select>
                            </FormControl>
                          ) : (
                            <Chip
                              label={getRoleLabel(member.role)}
                              size="small"
                              sx={{
                                backgroundColor: `${getRoleColor(member.role)}20`,
                                color: getRoleColor(member.role),
                                fontWeight: 600,
                                height: 24,
                                fontSize: '0.75rem',
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography
                            variant="body2"
                            sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: '0.85rem' }}
                          >
                            {new Date(member.created_at).toLocaleDateString(locale)}
                          </Typography>
                        </TableCell>
                        {canManage && (
                          <TableCell align="center" sx={{ py: 2 }}>
                            <Tooltip title="移除成员">
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveMember(member.id)}
                                sx={{ 
                                  color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                                  '&:hover': {
                                    color: '#ef4444',
                                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                                  },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Invite Dialog with User Search */}
        <Dialog
          open={inviteDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: isDark ? '#1c1917' : '#ffffff',
              borderRadius: 2,
              overflow: 'visible',
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>邀请成员</DialogTitle>
          <DialogContent sx={{ overflow: 'visible' }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                {successMessage}
              </Alert>
            )}
            
            <Box sx={{ mb: 3 }}>
              <UserSearch
                projectId={projectId}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                placeholder="搜索用户名、邮箱或ID..."
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>角色权限</InputLabel>
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                label="角色权限"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="read">{t('project.team.role.viewer')} - 可查看</MenuItem>
                <MenuItem value="write">{t('project.team.role.editor')} - 可编辑</MenuItem>
                <MenuItem value="admin">{t('project.team.role.admin')} - 管理员</MenuItem>
              </Select>
            </FormControl>

          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{ 
                textTransform: 'none',
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleInvite}
              variant="contained"
              data-testid="team-submit-invite"
              disabled={!selectedUser || inviting}
              sx={{
                backgroundColor: CEYLON_ORANGE,
                '&:hover': { backgroundColor: '#A34712' },
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
              }}
            >
              {inviting ? t('common.loading') : t('project.team.invite')}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  )
}
