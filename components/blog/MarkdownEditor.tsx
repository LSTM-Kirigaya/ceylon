'use client'

import { useState, useCallback } from 'react'
import {
  Box,
  Tabs,
  Tab,
  TextField,
  Paper,
  Typography,
} from '@mui/material'
import { useThemeStore } from '@/stores/themeStore'
import MarkdownRenderer from './MarkdownRenderer'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: string | number
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your blog post in Markdown...',
  height = '500px',
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState(0)
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{
          mb: 2,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          '& .MuiTabs-flexContainer': {
            gap: 2,
          },
        }}
      >
        <Tab label="Edit" sx={{ textTransform: 'none' }} />
        <Tab label="Preview" sx={{ textTransform: 'none' }} />
        <Tab label="Split" sx={{ textTransform: 'none' }} />
      </Tabs>

      {activeTab === 0 && (
        <Paper
          sx={{
            p: 2,
            backgroundColor: isDark ? '#1c1917' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          }}
        >
          <TextField
            multiline
            fullWidth
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: 1.6,
                backgroundColor: isDark ? '#0a0a0a' : '#fafafa',
              },
              '& .MuiInputBase-input': {
                minHeight: height,
                padding: 2,
              },
            }}
          />
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper
          sx={{
            p: 3,
            minHeight: height,
            backgroundColor: isDark ? '#1c1917' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          }}
        >
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <Typography
              sx={{
                color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                fontStyle: 'italic',
              }}
            >
              Nothing to preview yet...
            </Typography>
          )}
        </Paper>
      )}

      {activeTab === 2 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Paper
            sx={{
              p: 2,
              backgroundColor: isDark ? '#1c1917' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}
          >
            <TextField
              multiline
              fullWidth
              placeholder={placeholder}
              value={value}
              onChange={handleChange}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  backgroundColor: isDark ? '#0a0a0a' : '#fafafa',
                },
                '& .MuiInputBase-input': {
                  minHeight: height,
                  padding: 2,
                },
              }}
            />
          </Paper>
          <Paper
            sx={{
              p: 3,
              minHeight: height,
              backgroundColor: isDark ? '#1c1917' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              overflow: 'auto',
            }}
          >
            {value ? (
              <MarkdownRenderer content={value} />
            ) : (
              <Typography
                sx={{
                  color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  fontStyle: 'italic',
                }}
              >
                Nothing to preview yet...
              </Typography>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  )
}
