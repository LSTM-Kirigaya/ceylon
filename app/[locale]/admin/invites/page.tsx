'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import { useThemeStore } from '@/stores/themeStore'
import { Delete } from '@mui/icons-material'

type InviteRow = {
  id: string
  code: string
  note: string | null
  created_at: string
  expires_at: string | null
  max_uses: number | null
  remaining_uses: number | null
}

export default function AdminInvitesPage() {
  const t = useTranslations('admin.invites')
  const tCommon = useTranslations('common')
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'
  const [rows, setRows] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const [validityDays, setValidityDays] = useState<number>(7)
  const [uses, setUses] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const skeletonRowCount = 6
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    const res = await fetch('/api/admin/invites', { credentials: 'include' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || 'Failed to load')
      return
    }
    setRows(body.invites ?? [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await load()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim() || undefined,
          note: note.trim() || undefined,
          validityDays,
          uses,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'Failed to create')
        return
      }
      setCode('')
      setNote('')
      setValidityDays(7)
      setUses(1)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (id: string) => {
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/invites/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'Failed to delete')
        return
      }
      await load()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        {t('heading')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
        {t('subtitle')}
      </Typography>

      <Paper
        component="form"
        onSubmit={onCreate}
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: isDark ? '#1c1917' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 2,
          boxShadow: 'none',
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {t('createTitle')}
        </Typography>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'flex-end' }}>
          <TextField
            label={t('codeOptional')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('codePlaceholder')}
            size="small"
            fullWidth
          />
          <TextField label={t('note')} value={note} onChange={(e) => setNote(e.target.value)} size="small" fullWidth />
          <TextField
            select
            label={t('validity')}
            value={validityDays}
            onChange={(e) => setValidityDays(Number(e.target.value))}
            size="small"
            sx={{ minWidth: 220 }}
          >
            {[7, 30, 60, 90, 180].map((d) => (
              <MenuItem key={d} value={d}>
                {t('validityOption', { days: d })}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('uses')}
            type="number"
            value={uses}
            onChange={(e) => setUses(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
            size="small"
            sx={{ width: 150 }}
            inputProps={{ min: 1, max: 1000, step: 1 }}
          />
          <Button type="submit" variant="contained" disabled={submitting} sx={{ minWidth: 120 }}>
            {t('create')}
          </Button>
        </Stack>
        {error ? (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        ) : null}
      </Paper>

      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: isDark ? '#1c1917' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 2,
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        <Table size="small" sx={{ minWidth: 720, tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <TableCell>{t('table.code')}</TableCell>
              <TableCell>{t('table.status')}</TableCell>
              <TableCell>{t('table.remaining')}</TableCell>
              <TableCell>{t('table.note')}</TableCell>
              <TableCell>{t('table.created')}</TableCell>
              <TableCell>{t('table.expires')}</TableCell>
              <TableCell align="right" sx={{ width: 72 }}>
                {t('table.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(skeletonRowCount)].map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell sx={{ py: 1.25 }}>
                    <Skeleton variant="text" width={140} sx={{ transform: 'none' }} />
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Skeleton variant="rounded" height={28} width={88} sx={{ borderRadius: 999, transform: 'none' }} />
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Skeleton variant="text" width={88} sx={{ transform: 'none' }} />
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Skeleton variant="text" width="80%" sx={{ transform: 'none' }} />
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Skeleton variant="text" width={160} sx={{ transform: 'none' }} />
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Skeleton variant="text" width={160} sx={{ transform: 'none' }} />
                  </TableCell>
                  <TableCell sx={{ py: 1.25 }} align="right">
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 2, transform: 'none', ml: 'auto' }} />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {row.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const remaining = typeof row.remaining_uses === 'number' ? row.remaining_uses : 0
                      return remaining <= 0 ? (
                        <Chip size="small" label={t('status.used')} color="default" />
                      ) : (
                        <Chip size="small" label={t('status.unused')} color="success" />
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const remaining = typeof row.remaining_uses === 'number' ? row.remaining_uses : 0
                      const max = typeof row.max_uses === 'number' ? row.max_uses : null
                      return max != null ? `${remaining}/${max}` : String(remaining)
                    })()}
                  </TableCell>
                  <TableCell>{row.note || '—'}</TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                  <TableCell>{row.expires_at ? new Date(row.expires_at).toLocaleString() : '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={t('delete')}
                      onClick={() => setPendingDeleteId(row.id)}
                      disabled={deletingId === row.id}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 2,
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                      }}
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

      <Dialog
        open={pendingDeleteId != null}
        onClose={() => {
          if (!deletingId) setPendingDeleteId(null)
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('delete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('deleteConfirm')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)} disabled={Boolean(deletingId)}>
            {tCommon('cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={!pendingDeleteId || Boolean(deletingId)}
            onClick={async () => {
              if (!pendingDeleteId) return
              const id = pendingDeleteId
              setPendingDeleteId(null)
              await onDelete(id)
            }}
          >
            {tCommon('confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
