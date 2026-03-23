'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box,
  Typography,
  Button,
  Breadcrumbs,
  Link,
  Skeleton,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import {
  ArrowBack,
  MoreVert,
  Edit,
  Delete,
  Add,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Project, VersionView } from '@/types'
import MainLayout from '@/components/MainLayout'
import RequirementsTable from '@/components/requirements/RequirementsTable'

export default function ViewPage({ params }: { params: Promise<{ locale: string; projectId: string; viewId: string }> }) {
  const { locale, projectId, viewId } = use(params)
  const router = useRouter()
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  
  const [project, setProject] = useState<Project | null>(null)
  const [view, setView] = useState<VersionView | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  useEffect(() => {
    if (projectId && viewId) {
      fetchData()
    }
  }, [projectId, viewId])

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

      // Fetch view
      const { data: viewData, error: viewError } = await supabase
        .from('version_views')
        .select('*')
        .eq('id', viewId)
        .eq('project_id', projectId)
        .single()

      if (viewError) throw viewError
      setView(viewData)
      setEditName(viewData.name)
      setEditDesc(viewData.description || '')
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateView = async () => {
    if (!editName.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('version_views')
        .update({
          name: editName.trim(),
          description: editDesc.trim() || null,
        })
        .eq('id', viewId)

      if (error) throw error

      await fetchData()
      setEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating view:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteView = async () => {
    if (!confirm('确定要删除这个版本视图吗？')) return

    try {
      const { error } = await supabase
        .from('version_views')
        .delete()
        .eq('id', viewId)

      if (error) throw error

      router.push(`/${locale}/dashboard/project/${projectId}`)
    } catch (error) {
      console.error('Error deleting view:', error)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Skeleton variant="text" height={60} />
          <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
        </Box>
      </MainLayout>
    )
  }

  if (!project || !view) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Typography>{t('errors.notFound')}</Typography>
        </Box>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            href={`/${locale}/dashboard`}
            style={{
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              textDecoration: 'none',
            }}
          >
            {t('nav.dashboard')}
          </Link>
          <Link
            href={`/${locale}/dashboard/project/${projectId}`}
            style={{
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              textDecoration: 'none',
            }}
          >
            {project.name}
          </Link>
          <Typography sx={{ color: isDark ? 'white' : '#1c1917' }}>
            {view.name}
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="text"
              startIcon={<ArrowBack />}
              onClick={() => router.push(`/${locale}/dashboard/project/${projectId}`)}
              sx={{ color: isDark ? 'white' : '#1c1917' }}
            >
              返回
            </Button>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: isDark ? 'white' : '#1c1917',
              }}
            >
              {view.name}
            </Typography>
            <IconButton
              onClick={(e) => setMenuAnchorEl(e.currentTarget)}
              sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
            >
              <MoreVert />
            </IconButton>
          </Box>
        </Box>

        {view.description && (
          <Typography
            variant="body1"
            sx={{
              mb: 4,
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            }}
          >
            {view.description}
          </Typography>
        )}

        {/* Requirements Table */}
        <RequirementsTable
          versionViewId={viewId}
          projectId={projectId}
        />

        {/* View Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
          PaperProps={{
            sx: {
              backgroundColor: isDark ? '#1c1917' : '#ffffff',
            },
          }}
        >
          <MenuItem onClick={() => { setEditDialogOpen(true); setMenuAnchorEl(null) }}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            编辑
          </MenuItem>
          <MenuItem onClick={() => { handleDeleteView(); setMenuAnchorEl(null) }} sx={{ color: '#ef4444' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            删除
          </MenuItem>
        </Menu>

        {/* Edit Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>编辑版本视图</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="名称"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              margin="normal"
              autoFocus
            />
            <TextField
              fullWidth
              label="描述"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              margin="normal"
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleUpdateView}
              variant="contained"
              disabled={!editName.trim() || saving}
              sx={{ backgroundColor: CEYLON_ORANGE }}
            >
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  )
}
