'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
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
  Menu,
  Autocomplete,
  InputAdornment,
} from '@mui/material'
import {
  Add,
  Delete,
  MoreHoriz,
  Settings,
  ViewColumn,
  ArrowBack,
} from '@mui/icons-material'
import { apiJson } from '@/lib/client-api'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { getSelectOptionColors } from '@/lib/selectOptionColors'
import type { Requirement, ProjectMember, VersionView, VersionViewColumn } from '@/types'

interface RequirementsTableProps {
  versionViewId: string
  projectId: string
}

function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
}

export default function RequirementsTable({ versionViewId, projectId }: RequirementsTableProps) {
  const router = useRouter()
  const locale = useLocale()
  const { getEffectiveMode } = useThemeStore()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [columns, setColumns] = useState<VersionViewColumn[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [view, setView] = useState<VersionView | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [addColOpen, setAddColOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColType, setNewColType] = useState<'text' | 'select' | 'person'>('text')
  const [colSaving, setColSaving] = useState(false)

  const [renameCol, setRenameCol] = useState<VersionViewColumn | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const [viewSettingsOpen, setViewSettingsOpen] = useState(false)
  const [viewNameDraft, setViewNameDraft] = useState('')
  const [viewDescDraft, setViewDescDraft] = useState('')
  const [viewSaving, setViewSaving] = useState(false)

  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<null | HTMLElement>(null)
  const [headerMenuCol, setHeaderMenuCol] = useState<VersionViewColumn | null>(null)

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [reqRes, colRes, memRes, viewRes] = await Promise.all([
        apiJson<{ requirements: Requirement[] }>(`/api/version-views/${versionViewId}/requirements`),
        apiJson<{ columns: VersionViewColumn[] }>(
          `/api/version-views/${versionViewId}/columns?projectId=${encodeURIComponent(projectId)}`
        ),
        apiJson<{ members: ProjectMember[] }>(`/api/projects/${projectId}/members`),
        apiJson<{ view: VersionView }>(
          `/api/version-views/${versionViewId}?projectId=${encodeURIComponent(projectId)}`
        ),
      ])

      const rawCols = colRes.columns ?? []
      setColumns(
        rawCols.map((c) => ({
          ...c,
          options: normalizeOptions(c.options),
        }))
      )
      setRequirements(reqRes.requirements ?? [])
      setMembers(
        (memRes.members ?? []).map((m) => ({
          ...m,
          profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
        }))
      )
      setView(viewRes.view ?? null)
    } catch (e) {
      console.error('RequirementsTable fetch', e)
    } finally {
      setLoading(false)
    }
  }, [versionViewId, projectId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ query?: string }>
      setSearchQuery(custom.detail?.query?.trim() || '')
    }
    window.addEventListener('requirements-global-search', handler as EventListener)
    return () => window.removeEventListener('requirements-global-search', handler as EventListener)
  }, [])

  const memberById = useMemo(() => {
    const m: Record<string, ProjectMember> = {}
    for (const x of members) m[x.user_id] = x
    return m
  }, [members])

  const filteredRows = useMemo(() => {
    if (!searchQuery) return requirements
    const q = searchQuery.toLowerCase()
    return requirements.filter((req) => {
      if (req.title.toLowerCase().includes(q)) return true
      const cv = req.custom_values || {}
      for (const c of columns) {
        const v = cv[c.id]
        if (v) {
          if (c.field_type === 'person') {
            const mem = memberById[v]
            const label = (mem?.profile?.display_name || mem?.profile?.email || v).toLowerCase()
            if (label.includes(q)) return true
          } else if (String(v).toLowerCase().includes(q)) return true
        }
      }
      return false
    })
  }, [requirements, searchQuery, columns, memberById])

  const patchRequirement = async (id: string, patch: Record<string, unknown>) => {
    const { requirement } = await apiJson<{ requirement: Requirement }>(`/api/requirements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, ...requirement } : r)))
  }

  const patchTitle = async (id: string, title: string) => {
    const t = title.trim()
    if (!t) return
    await patchRequirement(id, { title: t })
  }

  const patchCustomCell = async (reqId: string, columnId: string, value: string | null) => {
    await patchRequirement(reqId, { custom_values: { [columnId]: value } })
  }

  const addColumn = async () => {
    const name = newColName.trim()
    if (!name) return
    setColSaving(true)
    try {
      await apiJson(`/api/version-views/${versionViewId}/columns`, {
        method: 'POST',
        body: JSON.stringify({ name, field_type: newColType, options: [] }),
      })
      setAddColOpen(false)
      setNewColName('')
      setNewColType('text')
      await fetchAll()
    } catch (e) {
      console.error(e)
    } finally {
      setColSaving(false)
    }
  }

  const deleteColumn = async (col: VersionViewColumn) => {
    if (!confirm(`删除列「${col.name}」？该列数据将从所有行移除。`)) return
    try {
      await apiJson(`/api/version-views/${versionViewId}/columns/${col.id}`, { method: 'DELETE' })
      await fetchAll()
    } catch (e) {
      console.error(e)
    }
  }

  const saveRenameColumn = async () => {
    if (!renameCol) return
    const name = renameDraft.trim()
    if (!name) return
    try {
      await apiJson(`/api/version-views/${versionViewId}/columns/${renameCol.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      })
      setRenameCol(null)
      await fetchAll()
    } catch (e) {
      console.error(e)
    }
  }

  const ensureSelectOption = async (
    col: VersionViewColumn,
    nextOptions: string[]
  ): Promise<VersionViewColumn> => {
    const same =
      nextOptions.length === col.options.length &&
      nextOptions.every((o, i) => o === col.options[i])
    if (same) return col
    const { column } = await apiJson<{ column: VersionViewColumn }>(
      `/api/version-views/${versionViewId}/columns/${col.id}`,
      { method: 'PATCH', body: JSON.stringify({ options: nextOptions }) }
    )
    const updated = { ...column, options: normalizeOptions(column.options) }
    setColumns((prev) => prev.map((c) => (c.id === col.id ? updated : c)))
    return updated
  }

  const onSelectChange = async (req: Requirement, col: VersionViewColumn, label: string | null) => {
    if (!label || !label.trim()) {
      await patchCustomCell(req.id, col.id, null)
      return
    }
    const trimmed = label.trim()
    let opts = [...col.options]
    if (!opts.includes(trimmed)) opts = [...opts, trimmed]
    await ensureSelectOption(col, opts)
    await patchCustomCell(req.id, col.id, trimmed)
  }

  const addRow = async () => {
    try {
      await apiJson(`/api/version-views/${versionViewId}/requirements`, {
        method: 'POST',
        body: JSON.stringify({
          title: '新需求',
          description: null,
          assignee_id: null,
          priority: 5,
          type: 'Feature',
          status: 'pending',
        }),
      })
      await fetchAll()
    } catch (e) {
      console.error(e)
    }
  }

  const deleteRow = async (id: string) => {
    if (!confirm('删除此行？')) return
    try {
      await apiJson(`/api/requirements/${id}`, { method: 'DELETE' })
      await fetchAll()
    } catch (e) {
      console.error(e)
    }
  }

  const openViewSettings = () => {
    if (view) {
      setViewNameDraft(view.name)
      setViewDescDraft(view.description || '')
    }
    setViewSettingsOpen(true)
  }

  const saveViewSettings = async () => {
    const name = viewNameDraft.trim()
    if (!name) return
    setViewSaving(true)
    try {
      await apiJson(`/api/version-views/${versionViewId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, description: viewDescDraft.trim() || null }),
      })
      await fetchAll()
      setViewSettingsOpen(false)
      window.dispatchEvent(new CustomEvent('ceylon-view-renamed'))
    } catch (e) {
      console.error(e)
    } finally {
      setViewSaving(false)
    }
  }

  const deleteView = async () => {
    if (!confirm('确定删除该版本视图？')) return
    try {
      await apiJson(`/api/version-views/${versionViewId}`, { method: 'DELETE' })
      router.push(`/${locale}/dashboard/project/${projectId}`)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <Box data-testid="requirements-loading">
        <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 2 }} />
      </Box>
    )
  }

  return (
    <Box data-testid="requirements-table-root">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            startIcon={<ArrowBack />}
            onClick={() => router.push(`/${locale}/dashboard/project/${projectId}`)}
            sx={{
              textTransform: 'none',
              color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
            }}
          >
            返回项目
          </Button>
          <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
            {filteredRows.length} 行
            {searchQuery ? ` · 已筛选` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="视图名称与描述、删除视图">
            <Button
              size="small"
              variant="outlined"
              startIcon={<Settings />}
              onClick={openViewSettings}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              视图设置
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={addRow}
            sx={{
              backgroundColor: CEYLON_ORANGE,
              '&:hover': { backgroundColor: '#A34712' },
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            新行
          </Button>
        </Box>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: isDark ? '#1c1917' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 2,
          boxShadow: 'none',
          overflowX: 'auto',
        }}
      >
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <TableCell
                sx={{
                  width: 56,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                }}
              >
                #
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 200,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                }}
              >
                标题
              </TableCell>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  sx={{
                    minWidth: 160,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                      <ViewColumn sx={{ fontSize: 16, opacity: 0.5 }} />
                      <Typography component="span" noWrap variant="inherit" sx={{ fontWeight: 700 }}>
                        {col.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={col.field_type === 'text' ? '文本' : col.field_type === 'select' ? '单选' : '人员'}
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          ml: 0.5,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        }}
                      />
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setHeaderMenuAnchor(e.currentTarget)
                        setHeaderMenuCol(col)
                      }}
                      sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}
                    >
                      <MoreHoriz fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  width: 56,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                }}
              >
                <Tooltip title="添加列">
                  <IconButton size="small" onClick={() => setAddColOpen(true)} sx={{ color: CEYLON_ORANGE }}>
                    <Add fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3 + columns.length} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
                    暂无数据，点击「新行」开始
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((req) => (
                <TableRow
                  key={req.id}
                  hover
                  sx={{
                    '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' },
                  }}
                >
                  <TableCell
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                      fontSize: '0.8rem',
                    }}
                  >
                    {req.requirement_number}
                  </TableCell>
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle' }}>
                    <TextField
                      variant="standard"
                      fullWidth
                      defaultValue={req.title}
                      key={`${req.id}-title-${req.updated_at}`}
                      InputProps={{
                        disableUnderline: false,
                        sx: {
                          fontSize: '0.875rem',
                          color: isDark ? 'white' : '#1c1917',
                          '&:before': { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)' },
                        },
                      }}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        if (v && v !== req.title) void patchTitle(req.id, v)
                      }}
                    />
                  </TableCell>
                  {columns.map((col) => {
                    const raw = req.custom_values?.[col.id] ?? ''
                    if (col.field_type === 'text') {
                      return (
                        <TableCell key={col.id} sx={{ py: 0.5, verticalAlign: 'middle' }}>
                          <TextField
                            variant="standard"
                            fullWidth
                            multiline
                            maxRows={3}
                            defaultValue={raw}
                            key={`${req.id}-${col.id}-${req.updated_at}`}
                            InputProps={{
                              sx: {
                                fontSize: '0.85rem',
                                color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.88)',
                              },
                            }}
                            onBlur={(e) => {
                              const v = e.target.value.trim()
                              const cur = (req.custom_values?.[col.id] || '').trim()
                              if (v !== cur) void patchCustomCell(req.id, col.id, v || null)
                            }}
                          />
                        </TableCell>
                      )
                    }
                    if (col.field_type === 'select') {
                      return (
                        <TableCell key={col.id} sx={{ py: 0.5, verticalAlign: 'middle', minWidth: 168 }}>
                          <Autocomplete
                            freeSolo
                            size="small"
                            options={col.options}
                            value={raw || null}
                            isOptionEqualToValue={(a, b) => a === b}
                            onChange={(_, v) => {
                              if (v === null) {
                                void onSelectChange(req, col, null)
                                return
                              }
                              void onSelectChange(req, col, typeof v === 'string' ? v : '')
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="选择或输入新选项"
                                variant="outlined"
                                onBlur={(e) => {
                                  const v = e.target.value?.trim() ?? ''
                                  if (!v) {
                                    if (raw) void onSelectChange(req, col, null)
                                    return
                                  }
                                  if (v !== raw) void onSelectChange(req, col, v)
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 1.5,
                                    fontSize: '0.85rem',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                  },
                                }}
                              />
                            )}
                            renderOption={(props, option) => {
                              const optIdx = col.options.indexOf(option as string)
                              const pal = getSelectOptionColors(Math.max(0, optIdx))
                              return (
                                <Box component="li" {...props}>
                                  <Chip
                                    size="small"
                                    label={option}
                                    sx={{
                                      backgroundColor: pal.bg,
                                      color: pal.fg,
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                    }}
                                  />
                                </Box>
                              )
                            }}
                          />
                        </TableCell>
                      )
                    }
                    /* person */
                    const mem = raw ? memberById[raw] : undefined
                    return (
                      <TableCell key={col.id} sx={{ py: 0.5, verticalAlign: 'middle', minWidth: 180 }}>
                        <Autocomplete
                          size="small"
                          options={members}
                          getOptionLabel={(m) =>
                            m.profile?.display_name || m.profile?.email || m.user_id
                          }
                          isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
                          value={mem ?? null}
                          onChange={(_, v) =>
                            void patchCustomCell(req.id, col.id, v ? v.user_id : null)
                          }
                          renderOption={(props, option) => {
                            return (
                              <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar
                                  src={option.profile?.avatar_url || undefined}
                                  sx={{ width: 26, height: 26, fontSize: 11, bgcolor: CEYLON_ORANGE }}
                                >
                                  {option.profile?.display_name?.[0] || option.profile?.email?.[0]}
                                </Avatar>
                                {option.profile?.display_name || option.profile?.email}
                              </Box>
                            )
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="选择成员"
                              variant="outlined"
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: raw ? (
                                  <InputAdornment position="start" sx={{ ml: 0.5 }}>
                                    <Avatar
                                      src={mem?.profile?.avatar_url || undefined}
                                      sx={{ width: 22, height: 22, fontSize: 10, bgcolor: CEYLON_ORANGE }}
                                    >
                                      {mem?.profile?.display_name?.[0] || mem?.profile?.email?.[0]}
                                    </Avatar>
                                  </InputAdornment>
                                ) : undefined,
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 1.5,
                                  fontSize: '0.85rem',
                                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                },
                              }}
                            />
                          )}
                        />
                      </TableCell>
                    )
                  })}
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => void deleteRow(req.id)} sx={{ color: '#ef4444' }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={headerMenuAnchor}
        open={Boolean(headerMenuAnchor)}
        onClose={() => {
          setHeaderMenuAnchor(null)
          setHeaderMenuCol(null)
        }}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (headerMenuCol) {
              setRenameCol(headerMenuCol)
              setRenameDraft(headerMenuCol.name)
            }
            setHeaderMenuAnchor(null)
          }}
        >
          重命名列
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (headerMenuCol) void deleteColumn(headerMenuCol)
            setHeaderMenuAnchor(null)
          }}
          sx={{ color: '#ef4444' }}
        >
          删除列
        </MenuItem>
      </Menu>

      <Dialog open={addColOpen} onClose={() => setAddColOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>添加列</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="列名"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>类型</InputLabel>
            <Select
              label="类型"
              value={newColType}
              onChange={(e) => setNewColType(e.target.value as 'text' | 'select' | 'person')}
            >
              <MenuItem value="text">文本</MenuItem>
              <MenuItem value="select">单选（可新增选项）</MenuItem>
              <MenuItem value="person">人员（项目成员）</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddColOpen(false)}>取消</Button>
          <Button variant="contained" disabled={!newColName.trim() || colSaving} onClick={() => void addColumn()}>
            添加
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(renameCol)} onClose={() => setRenameCol(null)} maxWidth="xs" fullWidth>
        <DialogTitle>重命名列</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="列名"
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameCol(null)}>取消</Button>
          <Button variant="contained" onClick={() => void saveRenameColumn()}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewSettingsOpen} onClose={() => setViewSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>视图设置</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="视图名称"
            value={viewNameDraft}
            onChange={(e) => setViewNameDraft(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="描述"
            value={viewDescDraft}
            onChange={(e) => setViewDescDraft(e.target.value)}
            margin="normal"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button color="error" onClick={() => void deleteView()}>
            删除视图
          </Button>
          <Box>
            <Button onClick={() => setViewSettingsOpen(false)} sx={{ mr: 1 }}>
              取消
            </Button>
            <Button
              variant="contained"
              disabled={!viewNameDraft.trim() || viewSaving}
              onClick={() => void saveViewSettings()}
              sx={{ backgroundColor: CEYLON_ORANGE }}
            >
              保存
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
