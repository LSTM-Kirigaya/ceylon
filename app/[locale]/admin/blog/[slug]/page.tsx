'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  MenuItem,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material'
import {
  Save,
  Preview,
  ArrowBack,
  Publish,
} from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'
import MarkdownEditor from '@/components/blog/MarkdownEditor'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'

const categories = [
  { value: 'journey', label: 'Journey' },
  { value: 'release', label: 'Release' },
  { value: 'tech', label: 'Tech Deep Dive' },
  { value: 'case', label: 'Case Studies' },
]

const statuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

interface BlogForm {
  slug: string
  title: string
  subtitle: string
  content: string
  excerpt: string
  cover_image: string
  category: string
  status: 'draft' | 'published' | 'archived'
  meta_title: string
  meta_description: string
}

export default function BlogEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const t = useTranslations('admin')
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'
  
  const [slug, setSlug] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [form, setForm] = useState<BlogForm>({
    slug: '',
    title: '',
    subtitle: '',
    content: '',
    excerpt: '',
    cover_image: '',
    category: 'journey',
    status: 'draft',
    meta_title: '',
    meta_description: '',
  })

  useEffect(() => {
    params.then(({ slug: s }) => {
      setSlug(s)
      if (s === 'new') {
        setIsNew(true)
        setLoading(false)
      } else {
        fetchPost(s)
      }
    })
  }, [params])

  const fetchPost = async (postSlug: string) => {
    try {
      const res = await fetch(`/api/admin/blog/${postSlug}`, { credentials: 'include' })
      if (res.ok) {
        const { post } = await res.json()
        setForm({
          slug: post.slug,
          title: post.title,
          subtitle: post.subtitle || '',
          content: post.content,
          excerpt: post.excerpt || '',
          cover_image: post.cover_image || '',
          category: post.category,
          status: post.status,
          meta_title: post.meta_title || '',
          meta_description: post.meta_description || '',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (publish = false) => {
    setSaving(true)
    const data = {
      ...form,
      status: publish ? 'published' : form.status,
      published_at: publish || form.status === 'published' ? (form.status === 'published' ? undefined : new Date().toISOString()) : undefined,
    }

    try {
      const url = isNew ? '/api/admin/blog' : `/api/admin/blog/${slug}`
      const method = isNew ? 'POST' : 'PUT'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (res.ok) {
        router.push('/admin/blog')
      }
    } finally {
      setSaving(false)
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/admin/blog')}
        >
          {t('common.back')}
        </Button>
        <Typography variant="h5" fontWeight={700}>
          {isNew ? t('blog.createTitle') : t('blog.editTitle')}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          startIcon={<Preview />}
          onClick={() => setPreviewOpen(true)}
          variant="outlined"
        >
          {t('blog.preview')}
        </Button>
        <Button
          startIcon={<Save />}
          onClick={() => handleSave(false)}
          disabled={saving}
          variant="outlined"
        >
          {t('common.save')}
        </Button>
        <Button
          startIcon={<Publish />}
          onClick={() => handleSave(true)}
          disabled={saving}
          variant="contained"
          sx={{
            backgroundColor: '#ea580c',
            '&:hover': { backgroundColor: '#c2410c' },
          }}
        >
          {t('blog.publish')}
        </Button>
      </Stack>

      <Paper
        sx={{
          p: 3,
          backgroundColor: isDark ? '#1c1917' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 2,
        }}
      >
        <Stack spacing={3}>
          <TextField
            label={t('blog.form.slug')}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            disabled={!isNew}
            helperText={isNew ? t('blog.form.slugHelp') : ''}
            fullWidth
          />
          
          <TextField
            label={t('blog.form.title')}
            value={form.title}
            onChange={(e) => {
              const title = e.target.value
              setForm({
                ...form,
                title,
                slug: isNew ? generateSlug(title) : form.slug,
                meta_title: form.meta_title || title,
              })
            }}
            fullWidth
            required
          />

          <TextField
            label={t('blog.form.subtitle')}
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              select
              label={t('blog.form.category')}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              sx={{ minWidth: 200 }}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label={t('blog.form.status')}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' | 'archived' })}
              sx={{ minWidth: 150 }}
            >
              {statuses.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label={t('blog.form.coverImage')}
            value={form.cover_image}
            onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
            placeholder="https://..."
            fullWidth
          />

          <TextField
            label={t('blog.form.excerpt')}
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            multiline
            rows={2}
            fullWidth
            helperText={t('blog.form.excerptHelp')}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('blog.form.content')}
            </Typography>
            <MarkdownEditor
              value={form.content}
              onChange={(value) => setForm({ ...form, content: value })}
              height="400px"
            />
          </Box>

          <Typography variant="h6" sx={{ mt: 2 }}>
            {t('blog.form.seo')}
          </Typography>

          <TextField
            label={t('blog.form.metaTitle')}
            value={form.meta_title}
            onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
            fullWidth
          />

          <TextField
            label={t('blog.form.metaDescription')}
            value={form.meta_description}
            onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>
      </Paper>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{form.title || t('blog.preview')}</DialogTitle>
        <DialogContent>
          <MarkdownRenderer content={form.content} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
