'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Skeleton,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  MoreVert,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Requirement, Profile, ProjectMember, REQUIREMENT_TYPES, REQUIREMENT_STATUS, getPriorityLabel, getPriorityColor } from '@/types'

interface RequirementsTableProps {
  versionViewId: string
  projectId: string
}

export default function RequirementsTable({ versionViewId, projectId }: RequirementsTableProps) {
  const { getEffectiveMode } = useThemeStore()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null)
  const [formData, setFormData] = useState<{
    title: string
    description: string
    assignee_id: string
    priority: number
    type: 'Bug' | 'Feature' | 'Improvement' | 'Documentation' | 'Security' | 'Discussion'
    status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  }>({
    title: '',
    description: '',
    assignee_id: '',
    priority: 5,
    type: 'Feature',
    status: 'pending',
  })
  const [saving, setSaving] = useState(false)

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  useEffect(() => {
    fetchData()
  }, [versionViewId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch requirements
      const { data: reqData, error: reqError } = await supabase
        .from('requirements')
        .select('*, assignee:profiles(*)')
        .eq('version_view_id', versionViewId)
        .order('requirement_number', { ascending: true })

      if (reqError) throw reqError
      setRequirements(reqData?.map(r => ({ ...r, assignee: r.assignee })) || [])

      // Fetch project members
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

  const handleSave = async () => {
    if (!formData.title.trim()) return

    setSaving(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      if (editingRequirement) {
        // Update existing
        const { error } = await supabase
          .from('requirements')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            assignee_id: formData.assignee_id || null,
            priority: formData.priority,
            type: formData.type,
            status: formData.status,
          })
          .eq('id', editingRequirement.id)

        if (error) throw error
      } else {
        // Create new - get next requirement number
        const { data: nextNum, error: rpcError } = await supabase
          .rpc('get_next_requirement_number', { p_version_view_id: versionViewId })

        if (rpcError) throw rpcError

        const { error } = await supabase
          .from('requirements')
          .insert({
            version_view_id: versionViewId,
            requirement_number: nextNum,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            assignee_id: formData.assignee_id || null,
            priority: formData.priority,
            type: formData.type,
            status: formData.status,
            created_by: userData.user.id,
          })

        if (error) throw error
      }

      await fetchData()
      handleCloseDialog()
    } catch (error) {
      console.error('Error saving requirement:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('requirements')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting requirement:', error)
    }
  }

  const handleOpenDialog = (requirement?: Requirement) => {
    if (requirement) {
      setEditingRequirement(requirement)
      setFormData({
        title: requirement.title,
        description: requirement.description || '',
        assignee_id: requirement.assignee_id || '',
        priority: requirement.priority,
        type: requirement.type,
        status: requirement.status,
      })
    } else {
      setEditingRequirement(null)
      setFormData({
        title: '',
        description: '',
        assignee_id: '',
        priority: 5,
        type: 'Feature',
        status: 'pending',
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingRequirement(null)
  }

  const getTypeChip = (type: string) => {
    const typeInfo = REQUIREMENT_TYPES.find(t => t.value === type)
    return (
      <Chip
        label={typeInfo?.label || type}
        size="small"
        sx={{
          backgroundColor: `${typeInfo?.color}20`,
          color: typeInfo?.color,
          fontWeight: 500,
          borderRadius: 1,
        }}
      />
    )
  }

  const getStatusChip = (status: string) => {
    const statusInfo = REQUIREMENT_STATUS.find(s => s.value === status)
    return (
      <Chip
        label={statusInfo?.label || status}
        size="small"
        sx={{
          backgroundColor: `${statusInfo?.color}20`,
          color: statusInfo?.color,
          fontWeight: 500,
          borderRadius: 1,
        }}
      />
    )
  }

  const getPriorityChip = (priority: number) => {
    const color = getPriorityColor(priority)
    return (
      <Chip
        label={getPriorityLabel(priority)}
        size="small"
        sx={{
          backgroundColor: `${color}20`,
          color: color,
          fontWeight: 500,
          borderRadius: 1,
        }}
      />
    )
  }

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={400} />
      </Box>
    )
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: isDark ? 'white' : '#1c1917' }}>
          需求列表 ({requirements.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{
            backgroundColor: CEYLON_ORANGE,
            '&:hover': { backgroundColor: '#A34712' },
          }}
        >
          新建需求
        </Button>
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: isDark ? '#1c1917' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: 3,
          boxShadow: 'none',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                编号
              </TableCell>
              <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                需求名
              </TableCell>
              <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                负责人
              </TableCell>
              <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                优先级
              </TableCell>
              <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                类型
              </TableCell>
              <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                状态
              </TableCell>
              <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontWeight: 600 }}>
                操作
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    还没有需求，点击"新建需求"开始添加
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              requirements.map((req) => (
                <TableRow
                  key={req.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    },
                  }}
                >
                  <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                    #{req.requirement_number}
                  </TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        color: isDark ? 'white' : '#1c1917',
                        fontWeight: 500,
                      }}
                    >
                      {req.title}
                    </Typography>
                    {req.description && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                          display: 'block',
                          mt: 0.5,
                        }}
                      >
                        {req.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {req.assignee ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          src={req.assignee.avatar_url || undefined}
                          sx={{ width: 28, height: 28, fontSize: 12 }}
                        >
                          {req.assignee.display_name?.[0] || req.assignee.email?.[0]}
                        </Avatar>
                        <Typography
                          variant="body2"
                          sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}
                        >
                          {req.assignee.display_name || req.assignee.email}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                      >
                        未分配
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{getPriorityChip(req.priority)}</TableCell>
                  <TableCell>{getTypeChip(req.type)}</TableCell>
                  <TableCell>{getStatusChip(req.status)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(req)}
                      sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(req.id)}
                      sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Create Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingRequirement ? '编辑需求' : '新建需求'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="需求名称"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
            autoFocus
          />
          <TextField
            fullWidth
            label="描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>负责人</InputLabel>
            <Select
              value={formData.assignee_id}
              onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
              label="负责人"
            >
              <MenuItem value="">
                <em>未分配</em>
              </MenuItem>
              {members.map((member) => (
                <MenuItem key={member.user_id} value={member.user_id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      src={member.profile?.avatar_url || undefined}
                      sx={{ width: 24, height: 24, fontSize: 10 }}
                    >
                      {member.profile?.display_name?.[0] || member.profile?.email?.[0]}
                    </Avatar>
                    {member.profile?.display_name || member.profile?.email}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>优先级</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as number })}
                label="优先级"
              >
                {[...Array(11)].map((_, i) => (
                  <MenuItem key={i} value={i}>
                    P{i}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>类型</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                label="类型"
              >
                {REQUIREMENT_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <FormControl fullWidth margin="normal">
            <InputLabel>状态</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              label="状态"
            >
              {REQUIREMENT_STATUS.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.title.trim() || saving}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
            }}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
