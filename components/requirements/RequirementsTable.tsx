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
  MoreHoriz,
  Settings,
  ViewColumn,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { apiJson } from '@/lib/client-api'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { getSelectOptionColors } from '@/lib/selectOptionColors'
import type { Requirement, ProjectMember, VersionView, VersionViewColumn } from '@/types'
import { getPriorityColor, getPriorityLabel, REQUIREMENT_STATUS } from '@/types'

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

  const [addColMenuAnchor, setAddColMenuAnchor] = useState<null | HTMLElement>(null)
  const [addColAfterPosition, setAddColAfterPosition] = useState<number | null>(null)
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
  const [activeSelectCell, setActiveSelectCell] = useState<{ reqId: string; key: string } | null>(
    null
  )

  const isSelectActive = (reqId: string, key: string) =>
    activeSelectCell?.reqId === reqId && activeSelectCell?.key === key

  const selectPillSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 999,
      minHeight: 36,
      px: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      '& fieldset': {
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      },
      '&:hover fieldset': {
        borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)',
      },
      '&.Mui-focused fieldset': {
        borderColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)',
      },
    },
    '& .MuiAutocomplete-input': {
      fontSize: '0.85rem',
      py: 0.75,
      color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.88)',
    },
    '& .MuiAutocomplete-endAdornment': {
      top: '50%',
      transform: 'translateY(-50%)',
      right: 10,
    },
    '& .MuiChip-root': {
      height: 24,
      borderRadius: 999,
      fontWeight: 800,
      fontSize: '0.75rem',
    },
    '& .MuiChip-deleteIcon': {
      opacity: 0.7,
      '&:hover': { opacity: 1 },
    },
  } as const

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

  const fetchRequirementsOnly = useCallback(async () => {
    try {
      const reqRes = await apiJson<{ requirements: Requirement[] }>(
        `/api/version-views/${versionViewId}/requirements`
      )
      setRequirements(reqRes.requirements ?? [])
    } catch (e) {
      console.error('fetchRequirementsOnly', e)
    }
  }, [versionViewId])

  const patchCustomCell = async (reqId: string, columnId: string, value: string | null) => {
    await patchRequirement(reqId, { custom_values: { [columnId]: value } })
  }

  const openAddColumnMenu = (
    e: { currentTarget: HTMLElement },
    opts?: { col?: VersionViewColumn; afterPosition?: number }
  ) => {
    setNewColName('')
    const initialType = opts?.col?.field_type ?? 'text'
    const afterPosition = opts?.col?.position !== undefined ? opts.col.position + 1 : opts?.afterPosition
    setNewColType(initialType)
    setAddColAfterPosition(typeof afterPosition === 'number' ? afterPosition : null)
    setAddColMenuAnchor(e.currentTarget)
  }

  const closeAddColumnMenu = () => {
    setAddColMenuAnchor(null)
    setAddColAfterPosition(null)
    setNewColName('')
    setNewColType('text')
  }

  const addColumn = async () => {
    const name = newColName.trim()
    if (!name) return
    setColSaving(true)
    try {
      await apiJson(`/api/version-views/${versionViewId}/columns`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          field_type: newColType,
          options: [],
          position: addColAfterPosition ?? undefined,
        }),
      })
      setAddColMenuAnchor(null)
      setAddColAfterPosition(null)
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
      // 静默更新：不要触发表格全量 loading/skeleton，避免“整页刷新感”
      await fetchRequirementsOnly()
    } catch (e) {
      console.error(e)
    }
  }

  const deleteRow = async (id: string) => {
    if (!confirm('删除此行？')) return
    try {
      await apiJson(`/api/requirements/${id}`, { method: 'DELETE' })
      await fetchRequirementsOnly()
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
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', mr: 'auto' }}>
          {filteredRows.length} 行
          {searchQuery ? ` · 已筛选` : ''}
        </Typography>
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
              <TableCell
                sx={{
                  width: 120,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                }}
              >
                优先级
              </TableCell>
              <TableCell
                sx={{
                  width: 140,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                }}
              >
                状态
              </TableCell>
              <TableCell
                sx={{
                  width: 140,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                }}
              >
                更新时间
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setHeaderMenuAnchor(e.currentTarget)
                          setHeaderMenuCol(col)
                        }}
                        sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}
                        aria-label={`列操作: ${col.name}`}
                      >
                        <MoreHoriz fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => openAddColumnMenu(e, { col })}
                        sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}
                        data-testid="requirements-add-column-plus"
                        aria-label={`在列后添加: ${col.name}`}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </TableCell>
              ))}
              <TableCell
                sx={{
                  width: 44,
                  textAlign: 'center',
                }}
              >
                <IconButton
                  size="small"
                  onClick={(e) => openAddColumnMenu(e)}
                  data-testid="requirements-add-column-plus"
                  aria-label="添加新列"
                  sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6 + columns.length} align="center" sx={{ py: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
                      暂无数据，点击下方 `+` 添加新行
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => void addRow()}
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 3,
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <Add />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ) : ([
              ...filteredRows.map((req) => (
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
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle', width: 120 }}>
                    <Autocomplete
                      freeSolo
                      openOnFocus
                      selectOnFocus
                      size="small"
                      onOpen={() => setActiveSelectCell({ reqId: req.id, key: 'priority' })}
                      onClose={() =>
                        setActiveSelectCell((prev) =>
                          prev?.reqId === req.id && prev?.key === 'priority' ? null : prev
                        )
                      }
                      options={Array.from({ length: 11 }).map((_, i) => i)}
                      value={typeof req.priority === 'number' ? Math.max(0, Math.min(10, req.priority)) : 5}
                      getOptionLabel={(v) => (typeof v === 'number' ? getPriorityLabel(v) : String(v))}
                      isOptionEqualToValue={(a, b) => a === b}
                      sx={selectPillSx}
                      onChange={(_, v) => {
                        if (v === null) return
                        let parsed: number | null = null
                        if (typeof v === 'number') {
                          parsed = v
                        } else {
                          const nums = String(v).trim().match(/(\d+)/g)
                          if (nums?.length) parsed = Number.parseInt(nums[nums.length - 1], 10)
                        }
                        if (parsed === null || !Number.isFinite(parsed)) return
                        const next = Math.max(0, Math.min(10, parsed))
                        void patchRequirement(req.id, { priority: next })
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          placeholder="查找或创建选项"
                          inputProps={{
                            ...params.inputProps,
                            readOnly: !isSelectActive(req.id, 'priority'),
                            value:
                              !isSelectActive(req.id, 'priority') && params.inputProps.value
                                ? ''
                                : params.inputProps.value,
                            onKeyDown: (e) => {
                              if (e.key !== 'Enter') return
                              const target = e.currentTarget as HTMLInputElement
                              const s = target.value.trim()
                              const nums = s.match(/(\d+)/g)
                              if (!nums?.length) return
                              const parsed = Number.parseInt(nums[nums.length - 1], 10)
                              if (!Number.isFinite(parsed)) return
                              const next = Math.max(0, Math.min(10, parsed))
                              e.preventDefault()
                              void patchRequirement(req.id, { priority: next })
                            },
                          }}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <Chip
                                  size="small"
                                  label={getPriorityLabel(
                                    typeof req.priority === 'number'
                                      ? Math.max(0, Math.min(10, req.priority))
                                      : 5
                                  )}
                                  sx={{
                                    backgroundColor: getPriorityColor(
                                      typeof req.priority === 'number'
                                        ? Math.max(0, Math.min(10, req.priority))
                                        : 5
                                    ),
                                    color: '#fff',
                                    mr: 0.75,
                                  }}
                                  onDelete={() => void patchRequirement(req.id, { priority: 5 })}
                                />
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              // actual visual style lives in selectPillSx
                            },
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box
                          component="li"
                          {...(() => {
                            const { key: _key, ...rest } = props as any
                            return rest
                          })()}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <Chip
                              size="small"
                              label={getPriorityLabel(option)}
                              sx={{
                                backgroundColor: getPriorityColor(option),
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                              }}
                            />
                            <Typography sx={{ opacity: 0.45, fontWeight: 800 }}>···</Typography>
                          </Box>
                        </Box>
                      )}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle', width: 140 }}>
                    <Autocomplete
                      freeSolo
                      openOnFocus
                      selectOnFocus
                      size="small"
                      disableClearable
                      onOpen={() => setActiveSelectCell({ reqId: req.id, key: 'status' })}
                      onClose={() =>
                        setActiveSelectCell((prev) =>
                          prev?.reqId === req.id && prev?.key === 'status' ? null : prev
                        )
                      }
                      options={REQUIREMENT_STATUS.map((s) => s.value)}
                      value={req.status}
                      getOptionLabel={(v) => {
                        const meta = REQUIREMENT_STATUS.find((s) => s.value === v)
                        return meta?.label || String(v)
                      }}
                      isOptionEqualToValue={(a, b) => a === b}
                      sx={selectPillSx}
                      onChange={(_, v) => {
                        if (v === null) return
                        const next = String(v).trim()
                        const match =
                          REQUIREMENT_STATUS.find((s) => s.value === next)?.value ||
                          REQUIREMENT_STATUS.find((s) => s.label === next)?.value ||
                          null
                        if (!match) return
                        void patchRequirement(req.id, { status: match })
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          placeholder="查找或创建选项"
                          inputProps={{
                            ...params.inputProps,
                            readOnly: !isSelectActive(req.id, 'status'),
                            value:
                              !isSelectActive(req.id, 'status') && params.inputProps.value
                                ? ''
                                : params.inputProps.value,
                            onKeyDown: (e) => {
                              if (e.key !== 'Enter') return
                              const target = e.currentTarget as HTMLInputElement
                              const s = target.value.trim()
                              const match =
                                REQUIREMENT_STATUS.find((x) => x.value === s)?.value ||
                                REQUIREMENT_STATUS.find((x) => x.label === s)?.value ||
                                null
                              if (!match) return
                              e.preventDefault()
                              void patchRequirement(req.id, { status: match })
                            },
                          }}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                {(() => {
                                  const meta = REQUIREMENT_STATUS.find((x) => x.value === req.status)
                                  return (
                                    <Chip
                                      size="small"
                                      label={meta?.label || String(req.status)}
                                      sx={{
                                        backgroundColor: meta?.color || '#6b7280',
                                        color: '#fff',
                                        mr: 0.75,
                                      }}
                                      onDelete={() => void patchRequirement(req.id, { status: 'pending' })}
                                    />
                                  )
                                })()}
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              // actual visual style lives in selectPillSx
                            },
                          }}
                        />
                      )}
                      renderOption={(props, option) => {
                        const meta = REQUIREMENT_STATUS.find((s) => s.value === option)
                        return (
                          <Box
                            component="li"
                            {...(() => {
                              const { key: _key, ...rest } = props as any
                              return rest
                            })()}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <Chip
                                size="small"
                                label={meta?.label || String(option)}
                                sx={{
                                  backgroundColor: meta?.color || '#6b7280',
                                  color: '#fff',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                }}
                              />
                              <Typography sx={{ opacity: 0.45, fontWeight: 800 }}>···</Typography>
                            </Box>
                          </Box>
                        )
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle', width: 140 }}>
                    {req.updated_at ? new Date(req.updated_at).toLocaleDateString() : '—'}
                  </TableCell>
                  {columns.map((col) => {
                    const raw = req.custom_values?.[col.id] ?? ''
                    if (col.field_type === 'text') {
                      return (
                        <TableCell key={col.id} sx={{ py: 0.5, verticalAlign: 'middle', minWidth: 160 }}>
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
                            openOnFocus
                            selectOnFocus
                            size="small"
                            options={col.options}
                            value={raw || null}
                            isOptionEqualToValue={(a, b) => a === b}
                            sx={selectPillSx}
                            onOpen={() => setActiveSelectCell({ reqId: req.id, key: col.id })}
                            onClose={() =>
                              setActiveSelectCell((prev) =>
                                prev?.reqId === req.id && prev?.key === col.id ? null : prev
                              )
                            }
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
                                placeholder="查找或创建选项"
                                variant="outlined"
                                inputProps={{
                                  ...params.inputProps,
                                  readOnly: !isSelectActive(req.id, col.id),
                                  value:
                                    !isSelectActive(req.id, col.id) && params.inputProps.value
                                      ? ''
                                      : params.inputProps.value,
                                  onKeyDown: (e) => {
                                    if (e.key !== 'Enter') return
                                    const target = e.currentTarget as HTMLInputElement
                                    const v = target.value.trim()
                                    if (!v) return
                                    e.preventDefault()
                                    void onSelectChange(req, col, v)
                                  },
                                }}
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment: raw ? (
                                    <>
                                      {(() => {
                                        const optIdx = col.options.indexOf(raw)
                                        const pal = getSelectOptionColors(Math.max(0, optIdx))
                                        return (
                                          <Chip
                                            size="small"
                                            label={raw}
                                            sx={{
                                              backgroundColor: pal.bg,
                                              color: pal.fg,
                                              mr: 0.75,
                                            }}
                                            onDelete={() => void onSelectChange(req, col, null)}
                                          />
                                        )
                                      })()}
                                      {params.InputProps.startAdornment}
                                    </>
                                  ) : (
                                    params.InputProps.startAdornment
                                  ),
                                }}
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
                                    // actual visual style lives in selectPillSx
                                  },
                                }}
                              />
                            )}
                            renderOption={(props, option) => {
                              const optIdx = col.options.indexOf(option as string)
                              const pal = getSelectOptionColors(Math.max(0, optIdx))
                              return (
                                <Box
                                  component="li"
                                  {...(() => {
                                    const { key: _key, ...rest } = props as any
                                    return rest
                                  })()}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <Chip
                                      size="small"
                                      label={option}
                                      sx={{
                                        backgroundColor: pal.bg,
                                        color: pal.fg,
                                        fontWeight: 800,
                                        fontSize: '0.75rem',
                                      }}
                                    />
                                    <Typography sx={{ opacity: 0.45, fontWeight: 800 }}>···</Typography>
                                  </Box>
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
                          getOptionLabel={(m) => m.profile?.display_name || m.profile?.email || m.user_id}
                          isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
                          value={mem ?? null}
                          onChange={(_, v) => void patchCustomCell(req.id, col.id, v ? v.user_id : null)}
                          renderOption={(props, option) => {
                            return (
                              <Box
                                component="li"
                                {...(() => {
                                  const { key: _key, ...rest } = props as any
                                  return rest
                                })()}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                              >
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
                    return null
                  })}

                  <TableCell
                    sx={{
                      width: 44,
                      py: 0.5,
                      verticalAlign: 'middle',
                      textAlign: 'center',
                    }}
                  />
                </TableRow>
              )),
              <TableRow
                key="add-bottom-row"
                sx={{
                  '&:hover': { backgroundColor: 'transparent' },
                }}
              >
                <TableCell
                  sx={{
                    width: 56,
                    py: 0.25,
                    verticalAlign: 'middle',
                    textAlign: 'center',
                  }}
                >
                  <IconButton
                    size="small"
                    data-testid="requirements-add-row-plus"
                    aria-label="添加新行"
                    onClick={(e) => {
                      e.stopPropagation()
                      void addRow()
                    }}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 2,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <Add fontSize="small" />
                  </IconButton>
                </TableCell>
                <TableCell colSpan={5 + columns.length} />
              </TableRow>,
            ]
          )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 
      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={closeDetail}
        PaperProps={{
          sx: {
            width: 460,
            backgroundColor: isDark ? '#1c1917' : '#ffffff',
            borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          },
        }}
      >
        <Box sx={{ p: 2.5, height: '100%', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              编辑需求
            </Typography>
            <IconButton size="small" onClick={closeDetail} sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 2 }}>
            <Chip
              size="small"
              label={`#${detailReq?.requirement_number ?? '—'}`}
              sx={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                fontWeight: 800,
              }}
            />
          </Box>

          <TextField
            fullWidth
            label="标题"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            size="small"
            sx={{ mb: 1.5 }}
          />
          <TextField
            fullWidth
            label="描述"
            value={draftDescription ?? ''}
            onChange={(e) => setDraftDescription(e.target.value)}
            size="small"
            multiline
            minRows={2}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>优先级</InputLabel>
              <Select
                label="优先级"
                value={draftPriority}
                onChange={(e) => setDraftPriority(Number(e.target.value))}
              >
                {Array.from({ length: 11 }).map((_, i) => (
                  <MenuItem key={i} value={i}>
                    {getPriorityLabel(i)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 190 }}>
              <InputLabel>状态</InputLabel>
              <Select
                label="状态"
                value={draftStatus}
                onChange={(e) => setDraftStatus(String(e.target.value))}
              >
                {REQUIREMENT_STATUS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Autocomplete
            size="small"
            options={members}
            value={draftAssigneeId ? members.find((m) => m.user_id === draftAssigneeId) ?? null : null}
            isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
            getOptionLabel={(m) => m.profile?.display_name || m.profile?.email || m.user_id}
            onChange={(_, v) => setDraftAssigneeId(v ? v.user_id : null)}
            renderInput={(params) => <TextField {...params} label="负责人" placeholder="选择成员" />}
            sx={{ mb: 2 }}
          />

          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', mb: 1 }}>
            字段
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {columns.map((col) => {
              const v = draftCustomValues[col.id] ?? null
              if (col.field_type === 'text') {
                return (
                  <TextField
                    key={col.id}
                    fullWidth
                    label={col.name}
                    value={v ?? ''}
                    onChange={(e) => setDraftCustomValues((prev) => ({ ...prev, [col.id]: e.target.value }))}
                    size="small"
                    multiline
                    minRows={2}
                  />
                )
              }

              if (col.field_type === 'select') {
                return (
                  <Autocomplete
                    key={col.id}
                    freeSolo
                    size="small"
                    options={col.options}
                    value={v ?? null}
                    onChange={(_, next) => {
                      const nv = typeof next === 'string' ? next : next === null ? null : null
                      setDraftCustomValues((prev) => ({ ...prev, [col.id]: nv }))
                    }}
                    renderInput={(params) => <TextField {...params} label={col.name} placeholder="选择或输入" />}
                  />
                )
              }

              if (col.field_type === 'person') {
                return (
                  <Autocomplete
                    key={col.id}
                    size="small"
                    options={members}
                    value={v ? members.find((m) => m.user_id === v) ?? null : null}
                    isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
                    getOptionLabel={(m) => m.profile?.display_name || m.profile?.email || m.user_id}
                    onChange={(_, next) => setDraftCustomValues((prev) => ({ ...prev, [col.id]: next ? next.user_id : null }))}
                    renderInput={(params) => <TextField {...params} label={col.name} placeholder="选择成员" />}
                  />
                )
              }

              return null
            })}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 1 }}>
            <Button
              color="error"
              startIcon={<DeleteIcon fontSize="small" />}
              onClick={() => {
                if (!detailReq) return
                void deleteRow(detailReq.id)
                closeDetail()
              }}
            >
              删除
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={closeDetail}>
                取消
              </Button>
              <Button variant="contained" disabled={detailSaving} onClick={() => void saveDetail()} sx={{ backgroundColor: CEYLON_ORANGE, '&:hover': { backgroundColor: '#A34712' } }}>
                {detailSaving ? '保存中...' : '完成'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Drawer>
      */}

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

      <Menu
        anchorEl={addColMenuAnchor}
        open={Boolean(addColMenuAnchor)}
        onClose={closeAddColumnMenu}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            width: 300,
          },
        }}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            p: 2,
          }}
        >
          <TextField
            autoFocus
            fullWidth
            label="列名"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            margin="normal"
            size="small"
          />

          <FormControl fullWidth margin="normal" size="small">
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

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button size="small" onClick={closeAddColumnMenu}>
              取消
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!newColName.trim() || colSaving}
              onClick={() => void addColumn()}
              sx={{ backgroundColor: CEYLON_ORANGE, '&:hover': { backgroundColor: '#A34712' } }}
            >
              添加
            </Button>
          </Box>
        </Box>
      </Menu>

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
