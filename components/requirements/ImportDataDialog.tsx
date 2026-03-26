'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Drawer,
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
  IconButton,
  CircularProgress,
} from '@mui/material'
import {
  CloudUpload,
  ContentPaste,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  InsertDriveFile,
} from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface ImportDataDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  viewId: string
  onSuccess?: () => void
}

type ImportStatus = 'idle' | 'uploading' | 'parsing' | 'preview' | 'importing' | 'success' | 'error'

interface ParsedData {
  headers: string[]
  rows: any[]
  totalRows: number
  fileName: string
  fileType: string
}

export default function ImportDataDialog({ open, onClose, projectId, viewId, onSuccess }: ImportDataDialogProps) {
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'
  
  const [activeTab, setActiveTab] = useState(0)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const parseFile = async (file: File) => {
    setStatus('parsing')
    setError(null)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      let parsed: any = { data: [] }

      if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
        // 解析 CSV/TSV
        const text = await file.text()
        parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter: extension === 'tsv' ? '\t' : ',',
        })
      } else if (extension === 'xlsx' || extension === 'xls') {
        // 解析 Excel
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[]
          const rows = jsonData.slice(1).map((row: any) => {
            const obj: any = {}
            headers.forEach((header, index) => {
              obj[header] = row[index] || ''
            })
            return obj
          })
          parsed = { data: rows, meta: { fields: headers } }
        }
      } else {
        throw new Error(t('requirements.import.unsupportedFormat'))
      }

      if (parsed.errors?.length > 0) {
        console.warn('Parse warnings:', parsed.errors)
      }

      const headers = parsed.meta?.fields || Object.keys(parsed.data[0] || {})
      
      setParsedData({
        headers,
        rows: parsed.data.slice(0, 100), // 只预览前100行
        totalRows: parsed.data.length,
        fileName: file.name,
        fileType: extension || 'unknown',
      })
      setSelectedFile(file)
      setStatus('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('requirements.import.parseError'))
      setStatus('error')
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files?.length > 0) {
      const file = files[0]
      const validTypes = ['.csv', '.tsv', '.txt', '.xlsx', '.xls']
      const isValid = validTypes.some(type => file.name.toLowerCase().endsWith(type))
      
      if (!isValid) {
        setError(t('requirements.import.invalidFileType'))
        setStatus('error')
        return
      }
      
      parseFile(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      parseFile(file)
    }
  }

  const handleImport = async () => {
    if (!parsedData || !selectedFile) return

    setStatus('importing')
    setProgress(0)

    try {
      // 上传文件到后端
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('projectId', projectId)
      formData.append('viewId', viewId)
      formData.append('fileName', parsedData.fileName)

      const response = await fetch(`/api/projects/${projectId}/views/${viewId}/import`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const body: any = await response.json().catch(() => ({}))
        throw new Error(body?.message || body?.error || t('requirements.import.uploadError'))
      }

      setStatus('success')
      setProgress(100)
      
      setTimeout(() => {
        onSuccess?.()
        handleClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('requirements.import.uploadError'))
      setStatus('error')
    }
  }

  const handleClose = () => {
    setStatus('idle')
    setParsedData(null)
    setSelectedFile(null)
    setError(null)
    setProgress(0)
    onClose()
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 500, md: 600 },
          backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 头部 */}
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: isDark ? '#1c1917' : '#fff',
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            {t('requirements.import.title')}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* 内容区 */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {status === 'success' ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CheckCircle sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('requirements.import.success')}
              </Typography>
              <Typography color="text.secondary">
                {t('requirements.import.successDesc', { count: parsedData?.totalRows ?? 0 })}
              </Typography>
            </Box>
          ) : (
            <>
              {/* 标签页 */}
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{ mb: 3 }}
              >
                <Tab label={t('requirements.import.uploadTab')} />
                <Tab label={t('requirements.import.pasteTab')} />
              </Tabs>

              {activeTab === 0 && (
                <>
                  {/* 说明文字 */}
                  <Alert severity="info" sx={{ mb: 3 }}>
                    {t('requirements.import.description')}
                  </Alert>

                  {/* 拖放区域 */}
                  {status === 'idle' || status === 'error' ? (
                    <Paper
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      sx={{
                        p: 6,
                        textAlign: 'center',
                        border: `2px dashed ${dragActive ? '#22c55e' : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                        backgroundColor: dragActive ? (isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)') : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt,.xlsx,.xls"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                        <CloudUpload sx={{ fontSize: 48, color: '#22c55e', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          {t('requirements.import.dragDrop')}
                        </Typography>
                        <Typography color="text.secondary">
                          {t('requirements.import.orBrowse')}
                        </Typography>
                      </label>
                    </Paper>
                  ) : status === 'parsing' || status === 'uploading' ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <CircularProgress sx={{ mb: 2 }} />
                      <Typography>
                        {status === 'parsing' ? t('requirements.import.parsing') : t('requirements.import.uploading')}
                      </Typography>
                    </Box>
                  ) : status === 'preview' && parsedData ? (
                    <Box>
                      <Paper sx={{ p: 2, mb: 2, backgroundColor: isDark ? '#1c1917' : '#fff' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <InsertDriveFile color="primary" />
                          <Typography fontWeight={500}>{parsedData.fileName}</Typography>
                          <Chip label={parsedData.fileType.toUpperCase()} size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {t('requirements.import.rowsFound', { count: parsedData.totalRows })}
                        </Typography>
                      </Paper>

                      <Typography variant="subtitle2" gutterBottom>
                        {t('requirements.import.preview')} ({Math.min(parsedData.rows.length, 100)} / {parsedData.totalRows})
                      </Typography>

                      <Paper sx={{ overflow: 'auto', maxHeight: 300, backgroundColor: isDark ? '#1c1917' : '#fff' }}>
                        <Box sx={{ minWidth: 500 }}>
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${parsedData.headers.length}, minmax(120px, 1fr))`,
                              gap: 1,
                              p: 1,
                              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            }}
                          >
                            {parsedData.headers.map((header) => (
                              <Typography key={header} variant="caption" fontWeight={600} noWrap>
                                {header}
                              </Typography>
                            ))}
                          </Box>
                          {parsedData.rows.slice(0, 5).map((row, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${parsedData.headers.length}, minmax(120px, 1fr))`,
                                gap: 1,
                                p: 1,
                                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                              }}
                            >
                              {parsedData.headers.map((header) => (
                                <Typography key={header} variant="body2" noWrap color="text.secondary">
                                  {String(row[header] || '').substring(0, 20)}
                                </Typography>
                              ))}
                            </Box>
                          ))}
                        </Box>
                      </Paper>
                    </Box>
                  ) : null}
                </>
              )}

              {activeTab === 1 && (
                <Alert severity="info">
                  {t('requirements.import.pasteComingSoon')}
                </Alert>
              )}

              {/* 错误提示 */}
              {error && (
                <Alert severity="error" sx={{ mt: 2 }} icon={<ErrorIcon />}>
                  {error}
                </Alert>
              )}
            </>
          )}
        </Box>

        {/* 底部按钮 */}
        {(status === 'preview' || status === 'importing' || status === 'error') && (
          <Box
            sx={{
              p: 2,
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1,
              backgroundColor: isDark ? '#1c1917' : '#fff',
            }}
          >
            <Button onClick={handleClose} disabled={status === 'importing'}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={status === 'importing' || !parsedData}
              startIcon={<CloudUpload />}
              sx={{
                backgroundColor: '#22c55e',
                '&:hover': { backgroundColor: '#16a34a' },
              }}
            >
              {status === 'importing' ? (
                <>
                  {t('requirements.import.importing')} ({progress}%)
                </>
              ) : (
                t('requirements.import.importData')
              )}
            </Button>
          </Box>
        )}

        {status === 'importing' && (
          <LinearProgress variant="determinate" value={progress} sx={{ height: 2 }} />
        )}
      </Box>
    </Drawer>
  )
}
