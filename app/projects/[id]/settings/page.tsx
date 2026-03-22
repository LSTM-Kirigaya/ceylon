'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Breadcrumbs,
  Link,
  Divider,
  Alert,
} from '@mui/material'
import {
  Save,
  Delete,
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { Project } from '@/types'
import MainLayout from '@/components/MainLayout'

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { profile } = useAuthStore()
  const { getEffectiveMode } = useThemeStore()
  
  const [project, setProject] = useState<Project | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const fetchProject = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      setProject(data)
      setName(data.name)
      setDescription(data.description || '')
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: '项目名称不能为空' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq('id', projectId)

      if (error) throw error

      setMessage({ type: 'success', text: '项目设置已保存' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这个项目吗？此操作不可恢复。')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      router.push('/dashboard')
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '删除失败' })
      setDeleting(false)
    }
  }

  const isOwner = project?.owner_id === profile?.id

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ p: 4 }}>
          <Typography>加载中...</Typography>
        </Box>
      </MainLayout>
    )
  }

  if (!project) {
    return (
      <MainLayout>
        <Box sx={{ p: 4 }}>
          <Typography>项目不存在</Typography>
        </Box>
      </MainLayout>
    )
  }

  if (!isOwner) {
    return (
      <MainLayout>
        <Box sx={{ p: 4 }}>
          <Alert severity="warning">
            只有项目所有者可以访问设置页面
          </Alert>
        </Box>
      </MainLayout>
    )
  }

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
            {project.name}
          </Link>
          <Typography sx={{ color: isDark ? 'white' : '#1c1917' }}>
            设置
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: isDark ? 'white' : '#1c1917',
            }}
          >
            项目设置
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 0.5,
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            }}
          >
            管理项目基本信息
          </Typography>
        </Box>

        {message && (
          <Alert
            severity={message.type}
            sx={{ mb: 3 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        {/* General Settings */}
        <Card sx={{ 
          mb: 3, 
          backgroundColor: isDark ? '#1c1917' : '#ffffff',
          borderRadius: 3,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: 'none',
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, color: isDark ? 'white' : '#1c1917' }}>
              基本信息
            </Typography>
            <TextField
              fullWidth
              label="项目名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="项目描述"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              multiline
              rows={4}
            />
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  backgroundColor: CEYLON_ORANGE,
                  '&:hover': { backgroundColor: '#A34712' },
                }}
              >
                {saving ? '保存中...' : '保存更改'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card sx={{ 
          backgroundColor: isDark ? '#1c1917' : '#ffffff', 
          border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
          borderRadius: 3,
          boxShadow: 'none',
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 1, color: '#ef4444' }}>
              危险区域
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
              以下操作不可逆，请谨慎操作
            </Typography>
            <Divider sx={{ mb: 3, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ color: isDark ? 'white' : '#1c1917', fontWeight: 600 }}>
                  删除项目
                </Typography>
                <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                  删除此项目及其所有数据，此操作不可恢复
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '删除中...' : '删除项目'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </MainLayout>
  )
}
