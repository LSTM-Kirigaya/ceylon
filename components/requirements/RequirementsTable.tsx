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
  Divider,
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
  KeyboardArrowDown,
} from '@mui/icons-material'
import { apiJson } from '@/lib/client-api'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { getSelectOptionColors } from '@/lib/selectOptionColors'
import type { Requirement, ProjectMember, VersionView, VersionViewColumn } from '@/types'
import { getPriorityColor, getPriorityLabel, REQUIREMENT_STATUS } from '@/types'

// React types used in handlers (avoid importing full React default)
import type React from 'react'

/** 编号列（#）固定像素宽，不参与列宽拖拽与 columnWidths 状态 */
const NUMBER_COL_WIDTH_PX = 56

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
  /** 首屏数据未就绪：表格区用骨架；行数单独用骨架，工具栏始终渲染 */
  const [tableLoading, setTableLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)
  const [filters, setFilters] = useState<
    { id: string; key: string; op: 'eq' | 'neq' | 'contains' | 'not_completed'; value: string }[]
  >([])

  const [draftFilterKey, setDraftFilterKey] = useState<string>('priority')
  const [draftFilterOp, setDraftFilterOp] = useState<'eq' | 'neq' | 'contains' | 'not_completed'>('eq')
  const [draftFilterValue, setDraftFilterValue] = useState<string>('')

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
  const [headerMenuTarget, setHeaderMenuTarget] = useState<
    | null
    | { kind: 'fixed'; key: 'number' | 'title' | 'priority' | 'status' }
    | { kind: 'custom'; col: VersionViewColumn }
  >(null)

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const PRIORITY_OPTIONS = [0, 1, 2, 3, 4, 5] as const
  const priorityPalette: Record<number, string> = {
    0: '#dc2626', // red
    1: '#ea580c', // orange
    2: '#f59e0b', // amber
    3: '#eab308', // yellow
    4: '#3b82f6', // blue
    5: '#6b7280', // gray
  }

  const getPriorityColorP0P5 = (p: number) => priorityPalette[p] ?? '#6b7280'

  const selectPillSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    width: '100%',
    borderRadius: 999,
    minHeight: 36,
    px: 1,
    cursor: 'pointer',
    textAlign: 'left',
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
    '&:hover': {
      borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)',
    },
    '&:focus-visible': {
      outline: `2px solid ${isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)'}`,
      outlineOffset: 2,
    },
  } as const

  const [optionMenuAnchor, setOptionMenuAnchor] = useState<null | HTMLElement>(null)
  const [optionMenuContext, setOptionMenuContext] = useState<null | {
    attributeName: string
    oldValue: string
  }>(null)
  const [renameDraftValue, setRenameDraftValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  const [selectMenuAnchor, setSelectMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectMenuQuery, setSelectMenuQuery] = useState('')
  const [selectMenuContext, setSelectMenuContext] = useState<
    | null
    | {
        kind: 'priority' | 'status' | 'custom'
        req: Requirement
        col?: VersionViewColumn
      }
  >(null)

  const closeSelectMenu = () => {
    setSelectMenuAnchor(null)
    setSelectMenuContext(null)
    setSelectMenuQuery('')
  }

  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>([])
  const isHidden = useCallback((k: string) => hiddenColumnKeys.includes(k), [hiddenColumnKeys])
  const toggleHidden = useCallback((k: string) => {
    setHiddenColumnKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }, [])

  const [sortState, setSortState] = useState<null | { key: string; dir: 'asc' | 'desc' }>(null)
  const clearSort = () => setSortState(null)

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const getWidth = useCallback(
    (k: string, fallback: number) => {
      if (k === 'number') return NUMBER_COL_WIDTH_PX
      const v = columnWidths[k]
      return typeof v === 'number' && Number.isFinite(v) ? v : fallback
    },
    [columnWidths]
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const any = (window as any).__ceylon_resize as
        | undefined
        | { key: string; startX: number; startW: number }
      if (!any) return
      if (any.key === 'number') return
      const delta = e.clientX - any.startX
      const next = Math.max(80, Math.min(800, any.startW + delta))
      setColumnWidths((prev) => ({ ...prev, [any.key]: next }))
    }
    const onUp = () => {
      ;(window as any).__ceylon_resize = undefined
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const startResize = (key: string, startW: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(window as any).__ceylon_resize = { key, startX: e.clientX, startW }
  }

  const fetchAll = useCallback(async () => {
    setTableLoading(true)
    try {
      const [fullRes, memRes] = await Promise.all([
        apiJson<{ data: { view: VersionView; columns: VersionViewColumn[]; requirements: Requirement[] } }>(
          `/api/version-views/${versionViewId}/full?projectId=${encodeURIComponent(projectId)}`
        ),
        apiJson<{ members: ProjectMember[] }>(`/api/projects/${projectId}/members`),
      ])

      const snap = fullRes.data
      setView(snap?.view ?? null)

      const rawCols = snap?.columns ?? []
      setColumns(rawCols.map((c) => ({ ...c, options: normalizeOptions(c.options) })))
      setRequirements(snap?.requirements ?? [])
      setMembers(
        (memRes.members ?? []).map((m) => ({
          ...m,
          profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
        }))
      )
    } catch (e) {
      console.error('RequirementsTable fetch', e)
    } finally {
      setTableLoading(false)
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

  const visibleColumns = useMemo(
    () => columns.filter((c) => !isHidden(`c:${c.id}`)),
    [columns, isHidden]
  )

  const filterFieldOptions = useMemo(() => {
    const base = [
      { key: 'priority', label: '优先级', type: 'select' as const },
      { key: 'status', label: '状态', type: 'select' as const },
      { key: 'title', label: '标题', type: 'text' as const },
    ]
    const dynamic = columns.map((c) => ({
      key: `c:${c.id}`,
      label: c.name,
      type: c.field_type === 'text' ? ('text' as const) : c.field_type === 'person' ? ('person' as const) : ('select' as const),
      col: c,
    }))
    return [...base, ...dynamic]
  }, [columns])

  const applyFilters = useCallback(
    (req: Requirement) => {
      for (const f of filters) {
        if (f.key === 'priority') {
          const p = typeof req.priority === 'number' ? req.priority : 5
          if (f.op === 'eq' && String(p) !== f.value) return false
          if (f.op === 'neq' && String(p) === f.value) return false
          continue
        }
        if (f.key === 'status') {
          if (f.op === 'not_completed') {
            if (req.status === 'completed') return false
            continue
          }
          if (f.op === 'eq' && req.status !== f.value) return false
          if (f.op === 'neq' && req.status === f.value) return false
          continue
        }
        if (f.key === 'title') {
          const t = (req.title || '').toLowerCase()
          const q = (f.value || '').toLowerCase()
          if (f.op === 'contains' && q && !t.includes(q)) return false
          if (f.op === 'eq' && q && t !== q) return false
          if (f.op === 'neq' && q && t === q) return false
          continue
        }
        if (f.key.startsWith('c:')) {
          const colId = f.key.slice(2)
          const col = columns.find((c) => c.id === colId)
          const raw = (req.custom_values?.[colId] ?? '') as string
          if (!col) continue
          if (col.field_type === 'text') {
            const t = String(raw || '').toLowerCase()
            const q = (f.value || '').toLowerCase()
            if (f.op === 'contains' && q && !t.includes(q)) return false
            if (f.op === 'eq' && q && t !== q) return false
            if (f.op === 'neq' && q && t === q) return false
          } else {
            // select/person treat as exact match
            if (f.op === 'eq' && String(raw || '') !== f.value) return false
            if (f.op === 'neq' && String(raw || '') === f.value) return false
          }
        }
      }
      return true
    },
    [filters, columns]
  )

  const getSortValue = useCallback(
    (req: Requirement, key: string) => {
      if (key === 'number') return req.requirement_number
      if (key === 'title') return req.title || ''
      if (key === 'priority') return typeof req.priority === 'number' ? req.priority : 999
      if (key === 'status') return req.status || ''
      if (key.startsWith('c:')) {
        const colId = key.slice(2)
        return (req.custom_values?.[colId] ?? '') || ''
      }
      return ''
    },
    []
  )

  const filteredRows = useMemo(() => {
    const searched = (() => {
      if (!searchQuery) return requirements
      const q = searchQuery.toLowerCase()
      return requirements.filter((req) => {
        if (req.title.toLowerCase().includes(q)) return true
        const cv = req.custom_values || {}
        for (const c of visibleColumns) {
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
    })()

    const base = filters.length > 0 ? searched.filter(applyFilters) : searched

    if (!sortState) return base
    const dir = sortState.dir === 'asc' ? 1 : -1
    const key = sortState.key
    return [...base].sort((a, b) => {
      const av = getSortValue(a, key) as any
      const bv = getSortValue(b, key) as any
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv), 'zh-Hans-CN') * dir
    })
  }, [requirements, searchQuery, visibleColumns, memberById, sortState, getSortValue, applyFilters, filters.length])

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
      const fullRes = await apiJson<{ data: { view: VersionView; columns: VersionViewColumn[]; requirements: Requirement[] } }>(
        `/api/version-views/${versionViewId}/full?projectId=${encodeURIComponent(projectId)}`
      )
      const reqs = fullRes.data?.requirements ?? []
      setRequirements(reqs)
    } catch (e) {
      console.error('fetchRequirementsOnly', e)
    }
  }, [versionViewId, projectId])

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

  const tableColSpan =
    3 + // number + title + blank cell
    (isHidden('priority') ? 0 : 1) +
    (isHidden('status') ? 0 : 1) +
    visibleColumns.length +
    1 // add-column plus

  const skeletonRowCount = 6

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
          <Typography
            variant="body2"
            component="span"
            sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            {tableLoading ? (
              <>
                <Skeleton
                  variant="text"
                  width={28}
                  sx={{
                    display: 'inline-block',
                    transform: 'none',
                    bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                />
                <span>行</span>
              </>
            ) : (
              <>
                {filteredRows.length} 行
                {searchQuery || filters.length > 0 ? ` · 已筛选` : ''}
              </>
            )}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            筛选
          </Button>
          {filters.length > 0 && (
            <Button
              size="small"
              onClick={() => setFilters([])}
              sx={{ textTransform: 'none', color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)' }}
            >
              清空筛选
            </Button>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            {filters.map((f) => {
              const field = filterFieldOptions.find((x) => x.key === f.key)
              const label =
                f.key === 'priority'
                  ? `优先级 ${f.op === 'neq' ? '≠' : '='} P${f.value}`
                  : f.key === 'status' && f.op === 'not_completed'
                    ? '状态 = 未完成'
                    : f.key === 'status'
                      ? `状态 ${f.op === 'neq' ? '≠' : '='} ${REQUIREMENT_STATUS.find((s) => s.value === f.value)?.label || f.value}`
                      : `${field?.label || f.key} ${f.op === 'contains' ? '包含' : f.op === 'neq' ? '≠' : '='} ${f.value}`
              return (
                <Chip
                  key={f.id}
                  size="small"
                  label={label}
                  onDelete={() => setFilters((prev) => prev.filter((x) => x.id !== f.id))}
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }}
                />
              )
            })}
          </Box>
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
        </Box>
      </Box>

      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => {
          setFilterMenuAnchor(null)
          setDraftFilterValue('')
          setDraftFilterOp('eq')
        }}
        transitionDuration={0}
        TransitionProps={{ timeout: 0 }}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            width: 360,
          },
        }}
      >
        <Box sx={{ p: 2 }} onClick={(e) => e.stopPropagation()}>
          <Typography sx={{ fontWeight: 900, fontSize: '0.85rem', mb: 1 }}>
            添加筛选
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>字段</InputLabel>
            <Select
              label="字段"
              value={draftFilterKey}
              onChange={(e) => {
                const k = String(e.target.value)
                setDraftFilterKey(k)
                setDraftFilterValue('')
                if (k === 'status') setDraftFilterOp('eq')
                else if (k === 'title' || k.startsWith('c:')) setDraftFilterOp('contains')
                else setDraftFilterOp('eq')
              }}
            >
              {filterFieldOptions.map((x) => (
                <MenuItem key={x.key} value={x.key}>
                  {x.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>条件</InputLabel>
            <Select label="条件" value={draftFilterOp} onChange={(e) => setDraftFilterOp(e.target.value as any)}>
              {draftFilterKey === 'status' ? (
                [
                  <MenuItem key="eq" value="eq">
                    等于
                  </MenuItem>,
                  <MenuItem key="neq" value="neq">
                    不等于
                  </MenuItem>,
                  <MenuItem key="not_completed" value="not_completed">
                    未完成
                  </MenuItem>,
                ]
              ) : draftFilterKey === 'title' || draftFilterKey.startsWith('c:') ? (
                [
                  <MenuItem key="contains" value="contains">
                    包含
                  </MenuItem>,
                  <MenuItem key="eq" value="eq">
                    等于
                  </MenuItem>,
                  <MenuItem key="neq" value="neq">
                    不等于
                  </MenuItem>,
                ]
              ) : (
                [
                  <MenuItem key="eq" value="eq">
                    等于
                  </MenuItem>,
                  <MenuItem key="neq" value="neq">
                    不等于
                  </MenuItem>,
                ]
              )}
            </Select>
          </FormControl>

          {draftFilterKey === 'priority' ? (
            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
              <InputLabel>值</InputLabel>
              <Select label="值" value={draftFilterValue} onChange={(e) => setDraftFilterValue(String(e.target.value))}>
                {[0, 1, 2, 3, 4, 5].map((p) => (
                  <MenuItem key={p} value={String(p)}>{`P${p}`}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : draftFilterKey === 'status' ? (
            <FormControl fullWidth size="small" sx={{ mb: 1 }} disabled={draftFilterOp === 'not_completed'}>
              <InputLabel>值</InputLabel>
              <Select label="值" value={draftFilterValue} onChange={(e) => setDraftFilterValue(String(e.target.value))}>
                {REQUIREMENT_STATUS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : draftFilterKey.startsWith('c:') ? (
            (() => {
              const colId = draftFilterKey.slice(2)
              const col = columns.find((c) => c.id === colId)
              if (col?.field_type === 'select') {
                return (
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel>值</InputLabel>
                    <Select label="值" value={draftFilterValue} onChange={(e) => setDraftFilterValue(String(e.target.value))}>
                      {(col.options ?? []).map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )
              }
              if (col?.field_type === 'person') {
                return (
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel>人员</InputLabel>
                    <Select label="人员" value={draftFilterValue} onChange={(e) => setDraftFilterValue(String(e.target.value))}>
                      {members.map((m) => (
                        <MenuItem key={m.user_id} value={m.user_id}>
                          {m.profile?.display_name || m.profile?.email || m.user_id}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )
              }
              return (
                <TextField
                  fullWidth
                  size="small"
                  label="值"
                  value={draftFilterValue}
                  onChange={(e) => setDraftFilterValue(e.target.value)}
                  sx={{ mb: 1 }}
                />
              )
            })()
          ) : (
            <TextField
              fullWidth
              size="small"
              label="值"
              value={draftFilterValue}
              onChange={(e) => setDraftFilterValue(e.target.value)}
              sx={{ mb: 1 }}
            />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
            <Button
              size="small"
              onClick={() => {
                setFilterMenuAnchor(null)
                setDraftFilterValue('')
                setDraftFilterOp('eq')
              }}
            >
              取消
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={
                !draftFilterKey ||
                (draftFilterKey === 'status'
                  ? draftFilterOp !== 'not_completed' && !draftFilterValue
                  : draftFilterKey === 'priority'
                    ? !draftFilterValue
                    : draftFilterOp !== 'not_completed' && !draftFilterValue.trim())
              }
              onClick={() => {
                const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
                const val = draftFilterOp === 'not_completed' ? '' : draftFilterValue.trim()
                setFilters((prev) => [...prev, { id, key: draftFilterKey, op: draftFilterOp, value: val }])
                setFilterMenuAnchor(null)
                setDraftFilterValue('')
              }}
              sx={{ backgroundColor: CEYLON_ORANGE, '&:hover': { backgroundColor: '#A34712' } }}
            >
              添加
            </Button>
          </Box>
        </Box>
      </Menu>

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
        <Table size="small" sx={{ minWidth: 720, tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <TableCell
                sx={{
                  width: NUMBER_COL_WIDTH_PX,
                  minWidth: NUMBER_COL_WIDTH_PX,
                  maxWidth: NUMBER_COL_WIDTH_PX,
                  boxSizing: 'border-box',
                  position: 'relative',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                  <Typography component="span" variant="inherit" sx={{ fontWeight: 700 }}>
                    #
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setHeaderMenuAnchor(e.currentTarget)
                      setHeaderMenuTarget({ kind: 'fixed', key: 'number' })
                    }}
                    sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}
                    aria-label="列操作: #"
                  >
                    <MoreHoriz fontSize="small" />
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell
                sx={{
                  width: getWidth('title', 260),
                  minWidth: getWidth('title', 200),
                  position: 'relative',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                  <Typography component="span" variant="inherit" sx={{ fontWeight: 700 }}>
                    标题
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setHeaderMenuAnchor(e.currentTarget)
                        setHeaderMenuTarget({ kind: 'fixed', key: 'title' })
                      }}
                      sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}
                      aria-label="列操作: 标题"
                    >
                      <MoreHoriz fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box
                  onMouseDown={(e) => startResize('title', getWidth('title', 260), e)}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: -3,
                    width: 6,
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 2,
                  }}
                />
              </TableCell>
              {!isHidden('priority') && (
                <TableCell
                  sx={{
                    width: getWidth('priority', 120),
                    minWidth: getWidth('priority', 120),
                    position: 'relative',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                    <Typography component="span" variant="inherit" sx={{ fontWeight: 700 }}>
                      优先级
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setHeaderMenuAnchor(e.currentTarget)
                        setHeaderMenuTarget({ kind: 'fixed', key: 'priority' })
                      }}
                      sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}
                      aria-label="列操作: 优先级"
                    >
                      <MoreHoriz fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box
                    onMouseDown={(e) => startResize('priority', getWidth('priority', 120), e)}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: -3,
                      width: 6,
                      height: '100%',
                      cursor: 'col-resize',
                      zIndex: 2,
                    }}
                  />
                </TableCell>
              )}
              {!isHidden('status') && (
                <TableCell
                  sx={{
                    width: getWidth('status', 140),
                    minWidth: getWidth('status', 140),
                    position: 'relative',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                    <Typography component="span" variant="inherit" sx={{ fontWeight: 700 }}>
                      状态
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setHeaderMenuAnchor(e.currentTarget)
                        setHeaderMenuTarget({ kind: 'fixed', key: 'status' })
                      }}
                      sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}
                      aria-label="列操作: 状态"
                    >
                      <MoreHoriz fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box
                    onMouseDown={(e) => startResize('status', getWidth('status', 140), e)}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: -3,
                      width: 6,
                      height: '100%',
                      cursor: 'col-resize',
                      zIndex: 2,
                    }}
                  />
                </TableCell>
              )}
              <TableCell
                sx={{
                  width: 140,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                }}
              >
              </TableCell>
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.id}
                  sx={{
                    width: getWidth(`c:${col.id}`, 160),
                    minWidth: getWidth(`c:${col.id}`, 160),
                    position: 'relative',
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
                          setHeaderMenuTarget({ kind: 'custom', col })
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
                  <Box
                    onMouseDown={(e) => startResize(`c:${col.id}`, getWidth(`c:${col.id}`, 160), e)}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: -3,
                      width: 6,
                      height: '100%',
                      cursor: 'col-resize',
                      zIndex: 2,
                    }}
                  />
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
            {tableLoading ? (
              [...Array(skeletonRowCount)].map((_, ri) => (
                <TableRow key={`sk-${ri}`}>
                  <TableCell sx={{ py: 1.25 }}>
                    <Skeleton variant="text" width={20} sx={{ transform: 'none' }} />
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Skeleton variant="text" width="90%" sx={{ transform: 'none' }} />
                  </TableCell>
                  {!isHidden('priority') && (
                    <TableCell sx={{ py: 1.25 }}>
                      <Skeleton variant="rounded" height={32} sx={{ borderRadius: 999, transform: 'none' }} />
                    </TableCell>
                  )}
                  {!isHidden('status') && (
                    <TableCell sx={{ py: 1.25 }}>
                      <Skeleton variant="rounded" height={32} sx={{ borderRadius: 999, transform: 'none' }} />
                    </TableCell>
                  )}
                  <TableCell sx={{ py: 1.25 }} />
                  {visibleColumns.map((c) => (
                    <TableCell key={c.id} sx={{ py: 1.25 }}>
                      <Skeleton
                        variant="rounded"
                        height={c.field_type === 'text' ? 28 : 32}
                        sx={{ borderRadius: c.field_type === 'text' ? 1 : 999, transform: 'none' }}
                      />
                    </TableCell>
                  ))}
                  <TableCell sx={{ py: 1.25, width: 44 }} />
                </TableRow>
              ))
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={tableColSpan}
                  align="center"
                  sx={{ py: 6 }}
                >
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
                      width: NUMBER_COL_WIDTH_PX,
                      minWidth: NUMBER_COL_WIDTH_PX,
                      maxWidth: NUMBER_COL_WIDTH_PX,
                      boxSizing: 'border-box',
                      color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                      fontSize: '0.8rem',
                    }}
                  >
                    {req.requirement_number}
                  </TableCell>
                  <TableCell sx={{ py: 0.5, verticalAlign: 'middle', width: getWidth('title', 260), minWidth: getWidth('title', 200) }}>
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
                  {!isHidden('priority') && (
                    <TableCell
                      sx={{ py: 0.5, verticalAlign: 'middle', width: getWidth('priority', 120), minWidth: getWidth('priority', 120) }}
                    >
                    <Box
                      component="button"
                      type="button"
                      tabIndex={0}
                      role="button"
                      aria-label="编辑优先级"
                      sx={selectPillSx}
                      onClick={(e) => {
                        setSelectMenuAnchor(e.currentTarget as HTMLElement)
                        setSelectMenuContext({ kind: 'priority', req })
                        setSelectMenuQuery('')
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return
                        e.preventDefault()
                        setSelectMenuAnchor(e.currentTarget as HTMLElement)
                        setSelectMenuContext({ kind: 'priority', req })
                        setSelectMenuQuery('')
                      }}
                    >
                      <Chip
                        size="small"
                        label={getPriorityLabel(
                          typeof req.priority === 'number' ? Math.max(0, Math.min(5, req.priority)) : 5
                        )}
                        sx={{
                          backgroundColor: getPriorityColorP0P5(
                            typeof req.priority === 'number' ? Math.max(0, Math.min(5, req.priority)) : 5
                          ),
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                        }}
                        onDelete={(e) => {
                          e.stopPropagation()
                          void patchRequirement(req.id, { priority: 5 })
                        }}
                      />
                      <KeyboardArrowDown
                        fontSize="small"
                        style={{ opacity: 0.75 }}
                      />
                    </Box>
                    </TableCell>
                  )}
                  {!isHidden('status') && (
                    <TableCell
                      sx={{ py: 0.5, verticalAlign: 'middle', width: getWidth('status', 140), minWidth: getWidth('status', 140) }}
                    >
                    <Box
                      component="button"
                      type="button"
                      tabIndex={0}
                      role="button"
                      aria-label="编辑状态"
                      sx={selectPillSx}
                      onClick={(e) => {
                        setSelectMenuAnchor(e.currentTarget as HTMLElement)
                        setSelectMenuContext({ kind: 'status', req })
                        setSelectMenuQuery('')
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return
                        e.preventDefault()
                        setSelectMenuAnchor(e.currentTarget as HTMLElement)
                        setSelectMenuContext({ kind: 'status', req })
                        setSelectMenuQuery('')
                      }}
                    >
                      {(() => {
                        const meta = REQUIREMENT_STATUS.find((x) => x.value === req.status)
                        return (
                          <Chip
                            size="small"
                            label={meta?.label || String(req.status)}
                            sx={{
                              backgroundColor: meta?.color || '#6b7280',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                            }}
                            onDelete={(e) => {
                              e.stopPropagation()
                              void patchRequirement(req.id, { status: 'pending' })
                            }}
                          />
                        )
                      })()}
                      <KeyboardArrowDown fontSize="small" style={{ opacity: 0.75 }} />
                    </Box>
                    </TableCell>
                  )}
                  {visibleColumns.map((col) => {
                    const raw = req.custom_values?.[col.id] ?? ''
                    if (col.field_type === 'text') {
                      return (
                        <TableCell
                          key={col.id}
                          sx={{
                            py: 0.5,
                            verticalAlign: 'middle',
                            width: getWidth(`c:${col.id}`, 160),
                            minWidth: getWidth(`c:${col.id}`, 160),
                          }}
                        >
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
                        <TableCell
                          key={col.id}
                          sx={{
                            py: 0.5,
                            verticalAlign: 'middle',
                            width: getWidth(`c:${col.id}`, 168),
                            minWidth: getWidth(`c:${col.id}`, 168),
                          }}
                        >
                          <Box
                            component="button"
                            type="button"
                            tabIndex={0}
                            role="button"
                            aria-label={`编辑${col.name}`}
                            sx={selectPillSx}
                            onClick={(e) => {
                              setSelectMenuAnchor(e.currentTarget as HTMLElement)
                              setSelectMenuContext({ kind: 'custom', req, col })
                              setSelectMenuQuery('')
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter' && e.key !== ' ') return
                              e.preventDefault()
                              setSelectMenuAnchor(e.currentTarget as HTMLElement)
                              setSelectMenuContext({ kind: 'custom', req, col })
                              setSelectMenuQuery('')
                            }}
                          >
                            {raw ? (
                              (() => {
                                const optIdx = col.options.indexOf(raw)
                                const pal = getSelectOptionColors(Math.max(0, optIdx))
                                return (
                                  <Chip
                                    size="small"
                                    label={raw}
                                    sx={{
                                      backgroundColor: pal.bg,
                                      color: pal.fg,
                                      fontWeight: 800,
                                      fontSize: '0.75rem',
                                    }}
                                    onDelete={(e) => {
                                      e.stopPropagation()
                                      void onSelectChange(req, col, null)
                                    }}
                                  />
                                )
                              })()
                            ) : (
                              <Typography
                                variant="body2"
                                sx={{
                                  color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                                  fontSize: '0.85rem',
                                }}
                              >
                                —
                              </Typography>
                            )}
                            <KeyboardArrowDown fontSize="small" style={{ opacity: 0.75 }} />
                          </Box>
                        </TableCell>
                      )
                    }
                    /* person */
                    const mem = raw ? memberById[raw] : undefined
                    return (
                      <TableCell
                        key={col.id}
                        sx={{
                          py: 0.5,
                          verticalAlign: 'middle',
                          width: getWidth(`c:${col.id}`, 180),
                          minWidth: getWidth(`c:${col.id}`, 180),
                        }}
                      >
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
                    width: NUMBER_COL_WIDTH_PX,
                    minWidth: NUMBER_COL_WIDTH_PX,
                    maxWidth: NUMBER_COL_WIDTH_PX,
                    boxSizing: 'border-box',
                    py: 0.5,
                    verticalAlign: 'middle',
                    textAlign: 'left',
                    /* # 列仅 56px：默认左右 16px 时内容区 24px，28px 按钮会溢出到「标题」列；与编号列左对齐并收紧右侧留白 */
                    pl: 2,
                    pr: 0.75,
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
                      width: 26,
                      height: 26,
                      p: 0.25,
                      borderRadius: 2,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <Add sx={{ fontSize: 18 }} />
                  </IconButton>
                </TableCell>
                <TableCell
                  colSpan={
                    2 + // title + blank cell
                    (isHidden('priority') ? 0 : 1) +
                    (isHidden('status') ? 0 : 1) +
                    visibleColumns.length +
                    1 // add-column plus
                  }
                />
              </TableRow>,
            ]
          )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={selectMenuAnchor}
        open={Boolean(selectMenuAnchor)}
        onClose={closeSelectMenu}
        transitionDuration={0}
        TransitionProps={{ timeout: 0 }}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            width: 280,
            overflow: 'hidden',
          },
        }}
        MenuListProps={{
          dense: true,
          onKeyDown: (e) => {
            // Keep Enter handling on the input, not the MenuList.
            if (e.key === 'Enter') e.preventDefault()
          },
        }}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            p: 1,
            pb: 0.75,
          }}
        >
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="查找或创建选项"
            value={selectMenuQuery}
            onChange={(e) => setSelectMenuQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              const ctx = selectMenuContext
              const q = selectMenuQuery.trim()
              if (!ctx || !q) return

              if (ctx.kind === 'priority') {
                const nums = q.match(/(\d+)/g)
                if (!nums?.length) return
                const parsed = Number.parseInt(nums[nums.length - 1], 10)
                if (!Number.isFinite(parsed)) return
                const next = Math.max(0, Math.min(5, parsed))
                void patchRequirement(ctx.req.id, { priority: next })
                closeSelectMenu()
                return
              }

              if (ctx.kind === 'status') {
                const match =
                  REQUIREMENT_STATUS.find((x) => x.value === q)?.value ||
                  REQUIREMENT_STATUS.find((x) => x.label === q)?.value ||
                  null
                if (!match) return
                void patchRequirement(ctx.req.id, { status: match })
                closeSelectMenu()
                return
              }

              // custom select: Enter creates/selects the typed option
              if (!ctx.col) return
              void onSelectChange(ctx.req, ctx.col, q)
              closeSelectMenu()
            }}
          />
        </Box>
        <Divider />
        <Box
          sx={{
            maxHeight: 320,
            overflowY: 'auto',
            py: 0.25,
          }}
        >
          {(() => {
            const ctx = selectMenuContext
            if (!ctx) return null
            const q = selectMenuQuery.trim().toLowerCase()

            if (ctx.kind === 'priority') {
              const opts = PRIORITY_OPTIONS.filter((p) =>
                !q ? true : getPriorityLabel(p).toLowerCase().includes(q) || String(p).includes(q)
              )
              return opts.map((p) => (
                <MenuItem
                  key={`p-${p}`}
                  selected={ctx.req.priority === p}
                  onClick={() => {
                    void patchRequirement(ctx.req.id, { priority: p })
                    closeSelectMenu()
                  }}
                  sx={{ py: 0.75 }}
                >
                  <Chip
                    size="small"
                    label={getPriorityLabel(p)}
                    sx={{
                      backgroundColor: getPriorityColorP0P5(p),
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                    }}
                  />
                </MenuItem>
              ))
            }

            if (ctx.kind === 'status') {
              const opts = REQUIREMENT_STATUS.filter((s) =>
                !q ? true : s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
              )
              return opts.map((s) => (
                <MenuItem
                  key={`s-${s.value}`}
                  selected={ctx.req.status === s.value}
                  onClick={() => {
                    void patchRequirement(ctx.req.id, { status: s.value })
                    closeSelectMenu()
                  }}
                  sx={{ py: 0.75 }}
                >
                  <Chip
                    size="small"
                    label={s.label}
                    sx={{
                      backgroundColor: s.color || '#6b7280',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                    }}
                  />
                </MenuItem>
              ))
            }

            const col = ctx.col
            if (!col) return null
            const current = (ctx.req.custom_values?.[col.id] ?? '') as string
            const opts = (col.options ?? []).filter((o) => (!q ? true : o.toLowerCase().includes(q)))
            return opts.map((o) => {
              const optIdx = col.options.indexOf(o)
              const pal = getSelectOptionColors(Math.max(0, optIdx))
              return (
                <MenuItem
                  key={`c-${col.id}-${o}`}
                  selected={current === o}
                  onClick={() => {
                    void onSelectChange(ctx.req, col, o)
                    closeSelectMenu()
                  }}
                  sx={{ py: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                >
                  <Chip
                    size="small"
                    label={o}
                    sx={{
                      backgroundColor: pal.bg,
                      color: pal.fg,
                      fontWeight: 800,
                      fontSize: '0.75rem',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setOptionMenuAnchor(e.currentTarget)
                      setOptionMenuContext({
                        attributeName: col.name,
                        oldValue: String(o),
                      })
                      setRenameDraftValue(String(o))
                    }}
                    sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)' }}
                    aria-label="修改选项"
                  >
                    <MoreHoriz fontSize="small" />
                  </IconButton>
                </MenuItem>
              )
            })
          })()}
        </Box>
      </Menu>

      <Menu
        anchorEl={optionMenuAnchor}
        open={Boolean(optionMenuAnchor)}
        onClose={() => {
          setOptionMenuAnchor(null)
          setOptionMenuContext(null)
          setRenameDraftValue('')
        }}
        transitionDuration={0}
        TransitionProps={{ timeout: 0 }}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            width: 280,
          },
        }}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            p: 2,
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', mb: 1 }}>
            修改选项
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="选项值"
            value={renameDraftValue}
            onChange={(e) => setRenameDraftValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              const ctx = optionMenuContext
              const next = renameDraftValue.trim()
              if (!ctx || !next || next === ctx.oldValue) return
              void (async () => {
                setRenaming(true)
                try {
                  await apiJson(`/api/projects/${projectId}/select-attributes/rename-option`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      attributeName: ctx.attributeName,
                      oldValue: ctx.oldValue,
                      newValue: next,
                    }),
                  })
                  await fetchAll()
                  setOptionMenuAnchor(null)
                  setOptionMenuContext(null)
                  setRenameDraftValue('')
                } finally {
                  setRenaming(false)
                }
              })()
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button
              size="small"
              onClick={() => {
                setOptionMenuAnchor(null)
                setOptionMenuContext(null)
                setRenameDraftValue('')
              }}
            >
              取消
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={
                renaming ||
                !optionMenuContext ||
                !renameDraftValue.trim() ||
                renameDraftValue.trim() === optionMenuContext.oldValue
              }
              onClick={() => {
                const ctx = optionMenuContext
                const next = renameDraftValue.trim()
                if (!ctx || !next || next === ctx.oldValue) return
                void (async () => {
                  setRenaming(true)
                  try {
                    await apiJson(`/api/projects/${projectId}/select-attributes/rename-option`, {
                      method: 'PATCH',
                      body: JSON.stringify({
                        attributeName: ctx.attributeName,
                        oldValue: ctx.oldValue,
                        newValue: next,
                      }),
                    })
                    await fetchAll()
                    setOptionMenuAnchor(null)
                    setOptionMenuContext(null)
                    setRenameDraftValue('')
                  } finally {
                    setRenaming(false)
                  }
                })()
              }}
              sx={{ backgroundColor: CEYLON_ORANGE, '&:hover': { backgroundColor: '#A34712' } }}
            >
              {renaming ? '保存中...' : '保存'}
            </Button>
          </Box>
        </Box>
      </Menu>

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
          setHeaderMenuTarget(null)
        }}
        transitionDuration={0}
        TransitionProps={{ timeout: 0 }}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1c1917' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (headerMenuTarget?.kind === 'custom') {
              setRenameCol(headerMenuTarget.col)
              setRenameDraft(headerMenuTarget.col.name)
            }
            setHeaderMenuAnchor(null)
            setHeaderMenuTarget(null)
          }}
          disabled={headerMenuTarget?.kind !== 'custom'}
        >
          重命名列
        </MenuItem>
        <MenuItem
          onClick={() => {
            const t = headerMenuTarget
            if (!t) return
            const key =
              t.kind === 'fixed' ? t.key : `c:${t.col.id}`
            toggleHidden(key)
            setHeaderMenuAnchor(null)
            setHeaderMenuTarget(null)
          }}
        >
          {(() => {
            const t = headerMenuTarget
            if (!t) return '隐藏字段'
            const key = t.kind === 'fixed' ? t.key : `c:${t.col.id}`
            return isHidden(key) ? '显示字段' : '隐藏字段'
          })()}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            const t = headerMenuTarget
            if (!t) return
            const k = t.kind === 'fixed' ? t.key : `c:${t.col.id}`
            setSortState({ key: k, dir: 'asc' })
            setHeaderMenuAnchor(null)
            setHeaderMenuTarget(null)
          }}
        >
          按该字段升序排序
        </MenuItem>
        <MenuItem
          onClick={() => {
            const t = headerMenuTarget
            if (!t) return
            const k = t.kind === 'fixed' ? t.key : `c:${t.col.id}`
            setSortState({ key: k, dir: 'desc' })
            setHeaderMenuAnchor(null)
            setHeaderMenuTarget(null)
          }}
        >
          按该字段倒序排序
        </MenuItem>
        <MenuItem
          onClick={() => {
            clearSort()
            setHeaderMenuAnchor(null)
            setHeaderMenuTarget(null)
          }}
          disabled={!sortState}
        >
          取消排序
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            const t = headerMenuTarget
            if (!t || t.kind !== 'custom') return
            openAddColumnMenu({ currentTarget: headerMenuAnchor as HTMLElement }, { afterPosition: t.col.position - 1 })
            setHeaderMenuAnchor(null)
            setHeaderMenuTarget(null)
          }}
          disabled={headerMenuTarget?.kind !== 'custom'}
        >
          向左插入字段/列
        </MenuItem>
        <MenuItem
          onClick={() => {
            const t = headerMenuTarget
            if (!t || t.kind !== 'custom') return
            openAddColumnMenu({ currentTarget: headerMenuAnchor as HTMLElement }, { col: t.col })
            setHeaderMenuAnchor(null)
            setHeaderMenuTarget(null)
          }}
          disabled={headerMenuTarget?.kind !== 'custom'}
        >
          向右插入字段/列
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (headerMenuTarget?.kind === 'custom') void deleteColumn(headerMenuTarget.col)
            setHeaderMenuAnchor(null)
            setHeaderMenuTarget(null)
          }}
          sx={{ color: '#ef4444' }}
          disabled={headerMenuTarget?.kind !== 'custom'}
        >
          删除列
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={addColMenuAnchor}
        open={Boolean(addColMenuAnchor)}
        onClose={closeAddColumnMenu}
        transitionDuration={0}
        TransitionProps={{ timeout: 0 }}
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
