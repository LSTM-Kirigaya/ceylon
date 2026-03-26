'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Article,
} from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'

type BlogPost = {
  id: string
  slug: string
  title: string
  category: string
  status: 'draft' | 'published' | 'archived'
  created_at: string
  published_at: string | null
  view_count: number
}

const categories = ['journey', 'release', 'tech', 'case']
const statuses = ['draft', 'published', 'archived']

export default function AdminBlogPage() {
  const router = useRouter()
  const t = useTranslations('admin')
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/admin/blog', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setPosts(data.posts)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPost) return
    
    try {
      const res = await fetch(`/api/admin/blog/${selectedPost.slug}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setPosts(posts.filter(p => p.slug !== selectedPost.slug))
      }
    } finally {
      setDeleteDialogOpen(false)
      setSelectedPost(null)
    }
  }

  const getCategoryLabel = (category: string) => {
    const key = `blog.categories.${category}`
    return t(key) || category
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success'
      case 'draft':
        return 'default'
      case 'archived':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            {t('blog.heading')}
          </Typography>
          <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
            {t('blog.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => router.push('blog/new')}
          sx={{
            backgroundColor: '#ea580c',
            '&:hover': { backgroundColor: '#c2410c' },
          }}
        >
          {t('blog.create')}
        </Button>
      </Box>

      <Paper
        sx={{
          backgroundColor: isDark ? '#1c1917' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 2,
          boxShadow: 'none',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : posts.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Article sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
            <Typography sx={{ opacity: 0.6 }}>
              {t('blog.empty')}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('blog.table.title')}</TableCell>
                  <TableCell>{t('blog.table.category')}</TableCell>
                  <TableCell>{t('blog.table.status')}</TableCell>
                  <TableCell>{t('blog.table.views')}</TableCell>
                  <TableCell>{t('blog.table.created')}</TableCell>
                  <TableCell align="right">{t('blog.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <Typography fontWeight={500}>{post.title}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.6 }}>
                        /{post.slug}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getCategoryLabel(post.category)}
                        size="small"
                        sx={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={post.status}
                        color={getStatusColor(post.status) as 'default' | 'success' | 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{post.view_count}</TableCell>
                    <TableCell>
                      {new Date(post.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => router.push(`blog/${post.slug}`)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedPost(post)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{t('blog.deleteTitle')}</DialogTitle>
        <DialogContent>
          {t('blog.deleteConfirm', { title: selectedPost?.title ?? '' })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
