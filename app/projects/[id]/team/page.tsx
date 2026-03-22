'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Breadcrumbs,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  Add,
  ArrowBack,
  Delete,
  Person,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Project, ProjectMember } from '@/types'
import MainLayout from '@/components/MainLayout'

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { profile } = useAuthStore()
  const { getEffectiveMode } = useThemeStore()
  
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'read' | 'write' | 'admin'>('read')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('*, profile:profiles(*)')
        .eq('project_id', projectId)

      if (membersError) throw membersError
      setMembers(membersData?.map(m => ({ ...m, profile: m.profile })) || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    setInviting(true)
    setError(null)

    try {
      // First, find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.trim())
        .single()

      if (userError || !userData) {
        setError('未找到该邮箱对应的用户')
        setInviting(false)
        return
      }

      // Check if already a member
      const existingMember = members.find(m => m.user_id === userData.id)
      if (existingMember) {
        setError('该用户已经是项目成员')
        setInviting(false)
        return
      }

      // Add member
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userData.id,
          role: inviteRole,
        })

      if (insertError) throw insertError

      await fetchData()
      setInviteDialogOpen(false)
      setInviteEmail('')
      setInviteRole('read')
    } catch (error: any) {
      setError(error.message || '邀请失败')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: 'read' | 'write' | 'admin') => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'read': return '只读'
      case 'write': return '可写'
      case 'admin': return '管理'
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

  const isOwner = project?.owner_id === profile?.id
  const currentUserMember = members.find(m => m.user_id === profile?.id)
  const canManage = isOwner || currentUserMember?.role === 'admin'

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
          <Link
            href={`/projects/${projectId}`}
            style={{
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              textDecoration: 'none',
            }}
          >
            {project?.name}
          </Link>
          <Typography sx={{ color: isDark ? 'white' : '#1c1917' }}>
            团队
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
              团队管理
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mt: 0.5,
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              }}
            >
              管理项目成员和权限
            </Typography>
          </Box>
          {canManage && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setInviteDialogOpen(true)}
              sx={{
                backgroundColor: CEYLON_ORANGE,
                '&:hover': { backgroundColor: '#A34712' },
              }}
            >
              邀请成员
            </Button>
          )}
        </Box>

        {/* Owner Card */}
        {project && (
          <Card sx={{ 
            mb: 3, 
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
            borderRadius: 3,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            boxShadow: 'none',
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: isDark ? 'white' : '#1c1917' }}>
                项目所有者
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    backgroundColor: CEYLON_ORANGE,
                  }}
                >
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ color: isDark ? 'white' : '#1c1917', fontWeight: 600 }}>
                    {isOwner ? (profile?.display_name || profile?.email) : '项目所有者'}
                  </Typography>
                  <Chip
                    label="所有者"
                    size="small"
                    sx={{
                      backgroundColor: `${CEYLON_ORANGE}20`,
                      color: CEYLON_ORANGE,
                      mt: 0.5,
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Members Table */}
        <Card sx={{ 
          backgroundColor: isDark ? '#1c1917' : '#ffffff',
          borderRadius: 3,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: 'none',
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: isDark ? 'white' : '#1c1917' }}>
              团队成员 ({members.length})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                      成员
                    </TableCell>
                    <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                      角色
                    </TableCell>
                    <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                      加入时间
                    </TableCell>
                    {canManage && (
                      <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                        操作
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 4 : 3} align="center" sx={{ py: 4 }}>
                        <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                          还没有团队成员
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                              src={member.profile?.avatar_url || undefined}
                              sx={{ width: 36, height: 36 }}
                            >
                              {member.profile?.display_name?.[0] || member.profile?.email?.[0]}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ color: isDark ? 'white' : '#1c1917', fontWeight: 500 }}
                              >
                                {member.profile?.display_name || member.profile?.email}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                              >
                                {member.profile?.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {canManage ? (
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <Select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(member.id, e.target.value as any)}
                                sx={{
                                  color: getRoleColor(member.role),
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: `${getRoleColor(member.role)}40`,
                                  },
                                }}
                              >
                                <MenuItem value="read">只读</MenuItem>
                                <MenuItem value="write">可写</MenuItem>
                                <MenuItem value="admin">管理</MenuItem>
                              </Select>
                            </FormControl>
                          ) : (
                            <Chip
                              label={getRoleLabel(member.role)}
                              size="small"
                              sx={{
                                backgroundColor: `${getRoleColor(member.role)}20`,
                                color: getRoleColor(member.role),
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
                          >
                            {new Date(member.created_at).toLocaleDateString('zh-CN')}
                          </Typography>
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveMember(member.id)}
                              sx={{ color: 'error.main' }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
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
      </Box>

      {/* Invite Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>邀请成员</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <TextField
            fullWidth
            label="邮箱地址"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            margin="normal"
            autoFocus
            placeholder="user@example.com"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>权限</InputLabel>
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              label="权限"
            >
              <MenuItem value="read">只读 - 只能查看需求和项目</MenuItem>
              <MenuItem value="write">可写 - 可以创建和编辑需求</MenuItem>
              <MenuItem value="admin">管理 - 可以管理项目设置和成员</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleInvite}
            variant="contained"
            disabled={!inviteEmail.trim() || inviting}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
            }}
          >
            {inviting ? '邀请中...' : '邀请'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  )
}
