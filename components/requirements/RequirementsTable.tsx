'use client'

import { useEffect, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
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
  Tooltip,
  InputAdornment,
  Stack,
  Menu,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  FilterList,
  Search,
  MoreHoriz,
  Sort,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Requirement, ProjectMember, REQUIREMENT_TYPES, REQUIREMENT_STATUS, getPriorityLabel, getPriorityColor } from '@/types'

interface RequirementsTableProps {
  versionViewId: string
  projectId: string
}

type SortField = 'requirement_number' | 'priority' | 'status' | 'type' | 'created_at'
type SortOrder = 'asc' | 'desc'

export default function RequirementsTable({ versionViewId, projectId }: RequirementsTableProps) {
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('requirement_number')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [menuRequirement, setMenuRequirement] = useState<Requirement | null>(null)
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
      const { data: reqData, error: reqError } = await supabase
        .from('requirements')
        .select('*, assignee:profiles(*)')
        .eq('version_view_id', versionViewId)
        .order('requirement_number', { ascending: true })

      if (reqError) throw reqError
      setRequirements(reqData?.map(r => ({ ...r, assignee: r.assignee })) || [])

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

  const filteredAndSortedRequirements = useMemo(() => {
    let result = [...requirements]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(req =>
        req.title.toLowerCase().includes(query) ||
        (req.description?.toLowerCase().includes(query)) ||
        req.requirement_number.toString().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(req => req.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(req => req.type === typeFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'requirement_number':
          comparison = a.requirement_number - b.requirement_number
          break
        case 'priority':
          comparison = a.priority - b.priority
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [requirements, searchQuery, statusFilter, typeFilter, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) return

    setSaving(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      if (editingRequirement) {
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, req: Requirement) => {
    setMenuAnchorEl(event.currentTarget)
    setMenuRequirement(req)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
    setMenuRequirement(null)
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
          fontWeight: 600,
          borderRadius: 1,
          fontSize: '0.75rem',
          height: 24,
        }}
      />
    )
  }

  const getStatusChip = (status: string) => {
    const statusInfo = REQUIREMENT_STATUS.find(s => s.value === status)
    const statusColors: Record<string, { bg: string; color: string }> = {
      'pending': { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' },
      'in_progress': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
      'completed': { bg: 'rgba(34, 197, 94, 0.15)', color: '#16a34a' },
      'rejected': { bg: 'rgba(239, 68, 68, 0.15)', color: '#dc2626' },
    }
    const colors = statusColors[status] || { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' }
    
    return (
      <Chip
        label={statusInfo?.label || status}
        size="small"
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 600,
          borderRadius: 1,
          fontSize: '0.75rem',
          height: 24,
        }}
      />
    )
  }

  const getPriorityChip = (priority: number) => {
    const color = getPriorityColor(priority)
    const priorityColors: Record<number, { bg: string; color: string }> = {
      0: { bg: 'rgba(239, 68, 68, 0.15)', color: '#dc2626' },
      1: { bg: 'rgba(249, 115, 22, 0.15)', color: '#ea580c' },
      2: { bg: 'rgba(245, 158, 11, 0.15)', color: '#d97706' },
      3: { bg: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' },
      4: { bg: 'rgba(132, 204, 22, 0.15)', color: '#65a30d' },
      5: { bg: 'rgba(34, 197, 94, 0.15)', color: '#16a34a' },
    }
    const colors = priorityColors[priority] || { bg: `${color}20`, color }
    
    return (
      <Chip
        label={`P${priority}`}
        size="small"
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 700,
          borderRadius: 1,
          fontSize: '0.75rem',
          height: 24,
          minWidth: 36,
        }}
      />
    )
  }

  const SortHeader = ({ field, children, align = 'left' }: { field: SortField; children: React.ReactNode; align?: 'left' | 'center' | 'right' }) => (
    <TableCell 
      align={align}
      sx={{ 
        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', 
        fontWeight: 600,
        fontSize: '0.8rem',
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': {
          color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
        },
        whiteSpace: 'nowrap',
      }}
      onClick={() => handleSort(field)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
        {children}
        {sortField === field && (
          sortOrder === 'asc' ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />
        )}
      </Box>
    </TableCell>
  )

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    )
  }

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0)

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ mb: 2 }}>
        {/* Top row with search and add button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              minWidth: 280,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {t('common.create')}
          </Button>
        </Box>

        {/* Filter row */}
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>
            {t('project.tabs.requirements')}: {filteredAndSortedRequirements.length}
          </Typography>
          <Box sx={{ width: 1, height: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', mx: 1 }} />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ fontSize: '0.8rem' }}>{t('common.status')}</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label={t('common.status')}
              sx={{ 
                fontSize: '0.8rem',
                borderRadius: 2,
              }}
            >
              <MenuItem value="all" sx={{ fontSize: '0.85rem' }}>全部</MenuItem>
              {REQUIREMENT_STATUS.map((status) => (
                <MenuItem key={status.value} value={status.value} sx={{ fontSize: '0.85rem' }}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ fontSize: '0.8rem' }}>{t('project.tabs.requirements')}</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label={t('project.tabs.requirements')}
              sx={{ 
                fontSize: '0.8rem',
                borderRadius: 2,
              }}
            >
              <MenuItem value="all" sx={{ fontSize: '0.85rem' }}>全部</MenuItem>
              {REQUIREMENT_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value} sx={{ fontSize: '0.85rem' }}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {activeFiltersCount > 0 && (
            <Button
              size="small"
              onClick={() => {
                setStatusFilter('all')
                setTypeFilter('all')
              }}
              sx={{ 
                textTransform: 'none', 
                fontSize: '0.75rem',
                color: CEYLON_ORANGE,
              }}
            >
              清除筛选
            </Button>
          )}
        </Stack>
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: isDark ? '#1c1917' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: 2,
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
              <SortHeader field="requirement_number" align="center">#</SortHeader>
              <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600, fontSize: '0.8rem' }}>
                需求名称
              </TableCell>
              <TableCell sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600, fontSize: '0.8rem' }}>
                负责人
              </TableCell>
              <SortHeader field="priority" align="center">优先级</SortHeader>
              <SortHeader field="type" align="center">类型</SortHeader>
              <SortHeader field="status" align="center">状态</SortHeader>
              <TableCell align="center" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600, fontSize: '0.8rem' }}>
                操作
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedRequirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', mb: 1 }}>
                      暂无需求
                    </Typography>
                    <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
                      点击右上角按钮创建新需求
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedRequirements.map((req) => (
                <TableRow
                  key={req.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    },
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <TableCell align="center" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: '0.85rem' }}>
                    #{req.requirement_number}
                  </TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        color: isDark ? 'white' : '#1c1917',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                      }}
                    >
                      {req.title}
                    </Typography>
                    {req.description && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                          display: 'block',
                          mt: 0.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 300,
                        }}
                      >
                        {req.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {req.assignee ? (
                      <Tooltip title={req.assignee.display_name || req.assignee.email || ''}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            src={req.assignee.avatar_url || undefined}
                            sx={{ 
                              width: 26, 
                              height: 26, 
                              fontSize: 11,
                              backgroundColor: CEYLON_ORANGE,
                            }}
                          >
                            {req.assignee.display_name?.[0] || req.assignee.email?.[0]}
                          </Avatar>
                          <Typography
                            variant="body2"
                            sx={{ 
                              color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
                              fontSize: '0.85rem',
                              maxWidth: 100,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {req.assignee.display_name || req.assignee.email?.split('@')[0]}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', fontSize: '0.85rem' }}
                      >
                        未分配
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">{getPriorityChip(req.priority)}</TableCell>
                  <TableCell align="center">{getTypeChip(req.type)}</TableCell>
                  <TableCell align="center">{getStatusChip(req.status)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="更多操作">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, req)}
                        sx={{ 
                          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                          '&:hover': {
                            color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                          },
                        }}
                      >
                        <MoreHoriz fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Row Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: isDark 
              ? '0 4px 20px rgba(0,0,0,0.5)' 
              : '0 4px 20px rgba(0,0,0,0.1)',
            minWidth: 140,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuRequirement) handleOpenDialog(menuRequirement)
            handleMenuClose()
          }}
          sx={{
            color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
            fontSize: '0.9rem',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1.5, fontSize: 18 }} />
          编辑
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuRequirement && confirm('确定要删除这个需求吗？')) {
              handleDelete(menuRequirement.id)
            }
            handleMenuClose()
          }}
          sx={{ 
            color: '#ef4444',
            fontSize: '0.9rem',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
            },
          }}
        >
          <Delete fontSize="small" sx={{ mr: 1.5, fontSize: 18 }} />
          删除
        </MenuItem>
      </Menu>

      {/* Edit/Create Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          {editingRequirement ? '编辑需求' : '创建需求'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="需求名称"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
            label="需求描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>负责人</InputLabel>
            <Select
              value={formData.assignee_id}
              onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
              label="负责人"
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">
                <em>未分配</em>
              </MenuItem>
              {members.map((member) => (
                <MenuItem key={member.user_id} value={member.user_id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      src={member.profile?.avatar_url || undefined}
                      sx={{ width: 24, height: 24, fontSize: 10, backgroundColor: CEYLON_ORANGE }}
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
                sx={{ borderRadius: 2 }}
              >
                {[...Array(11)].map((_, i) => (
                  <MenuItem key={i} value={i}>
                    P{i} {i <= 2 ? '- 紧急' : i <= 5 ? '- 高' : i <= 8 ? '- 中' : '- 低'}
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
                sx={{ borderRadius: 2 }}
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
              sx={{ borderRadius: 2 }}
            >
              {REQUIREMENT_STATUS.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
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
            onClick={handleSave}
            variant="contained"
            disabled={!formData.title.trim() || saving}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
            }}
          >
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
