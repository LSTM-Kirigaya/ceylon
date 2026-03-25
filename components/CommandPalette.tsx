'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Box,
  Dialog,
  TextField,
  InputAdornment,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  IconButton,
} from '@mui/material'
import {
  Search,
  Folder,
  Home,
  Settings,
  AccountCircle,
  Add,
  KeyboardCommandKey,
  KeyboardReturn,
} from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import { useTranslations, useLocale } from 'next-intl'

interface CommandItem {
  id: string
  title: string
  description?: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  category: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  // Define available commands
  const commands: CommandItem[] = [
    {
      id: 'home',
      title: t('nav.home') || '首页',
      description: 'Go to dashboard',
      icon: <Home sx={{ fontSize: 20 }} />,
      shortcut: 'H',
      action: () => { router.push(`/${locale}/dashboard`); onClose() },
      category: 'Navigation',
    },
    {
      id: 'new-project',
      title: '新建项目',
      description: 'Create a new project',
      icon: <Add sx={{ fontSize: 20 }} />,
      shortcut: 'N',
      action: () => { 
        // Dispatch custom event to open create project dialog
        window.dispatchEvent(new CustomEvent('openCreateProjectDialog'))
        onClose() 
      },
      category: 'Actions',
    },
    {
      id: 'profile',
      title: t('nav.profile') || '个人资料',
      description: 'View your profile',
      icon: <AccountCircle sx={{ fontSize: 20 }} />,
      action: () => { router.push(`/${locale}/profile`); onClose() },
      category: 'Navigation',
    },
    {
      id: 'settings',
      title: t('common.settings') || '设置',
      description: 'Application settings',
      icon: <Settings sx={{ fontSize: 20 }} />,
      action: () => { router.push(`/${locale}/settings`); onClose() },
      category: 'Navigation',
    },
  ]

  const contextualCommands: CommandItem[] = []
  if (pathname.includes('/view/') && searchQuery.trim()) {
    contextualCommands.push({
      id: 'search-requirements',
      title: `在当前视图搜索需求: ${searchQuery.trim()}`,
      description: '将搜索词应用到当前版本视图需求列表',
      icon: <Search sx={{ fontSize: 20 }} />,
      action: () => {
        window.dispatchEvent(
          new CustomEvent('requirements-global-search', {
            detail: { query: searchQuery.trim() },
          })
        )
        onClose()
      },
      category: 'Actions',
    })
  }

  const allCommands = [...contextualCommands, ...commands]

  // Filter commands based on search
  const filteredCommands = allCommands.filter(cmd => {
    if (!searchQuery || searchQuery.trim() === '') return true
    const query = searchQuery.toLowerCase().trim()
    return (
      cmd.title.toLowerCase().includes(query) ||
      cmd.description?.toLowerCase().includes(query) ||
      cmd.id.toLowerCase().includes(query)
    )
  })

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, CommandItem[]>)

  const categories = Object.keys(groupedCommands)
  const flatCommands = categories.flatMap(cat => groupedCommands[cat])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % flatCommands.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + flatCommands.length) % flatCommands.length)
        break
      case 'Enter':
        e.preventDefault()
        if (flatCommands[selectedIndex]) {
          flatCommands[selectedIndex].action()
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [open, flatCommands, selectedIndex, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 600,
          maxWidth: '90vw',
          backgroundColor: isDark ? '#1c1917' : '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isDark 
            ? '0 25px 50px -12px rgba(0,0,0,0.8)' 
            : '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        },
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'flex-start',
          pt: '15vh',
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      {/* Search Input */}
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          fullWidth
          autoFocus
          placeholder="搜索项目或运行命令..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ 
                  fontSize: 22, 
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' 
                }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'transparent',
              borderRadius: 2,
              fontSize: '1rem',
              '& fieldset': { border: 'none' },
              '& input': {
                color: isDark ? 'white' : '#1c1917',
                p: 1,
              },
            },
          }}
        />
      </Box>

      {/* Divider */}
      <Divider sx={{ 
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' 
      }} />

      {/* Results */}
      <Box sx={{ 
        maxHeight: 400, 
        overflow: 'auto',
        p: 1,
      }}>
        {flatCommands.length === 0 ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
          }}>
            <Typography variant="body2">
              没有找到匹配的命令
            </Typography>
          </Box>
        ) : (
          categories.map((category, catIndex) => (
            <Box key={category}>
              {/* Category Header */}
              <Typography
                variant="caption"
                sx={{
                  px: 2,
                  py: 1,
                  display: 'block',
                  color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {category === 'Navigation' ? '导航' : 
                 category === 'Actions' ? '操作' : category}
              </Typography>
              
              {/* Commands in this category */}
              {groupedCommands[category].map((cmd, idx) => {
                const globalIndex = flatCommands.findIndex(c => c.id === cmd.id)
                const isSelected = globalIndex === selectedIndex
                
                return (
                  <ListItem
                    key={cmd.id}
                    onClick={() => { cmd.action(); onClose() }}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      cursor: 'pointer',
                      backgroundColor: isSelected 
                        ? isDark ? 'rgba(200, 92, 27, 0.2)' : 'rgba(200, 92, 27, 0.1)'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: isSelected 
                          ? isDark ? 'rgba(200, 92, 27, 0.25)' : 'rgba(200, 92, 27, 0.15)'
                          : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <ListItemIcon sx={{ 
                      color: isSelected ? CEYLON_ORANGE : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                      minWidth: 40,
                    }}>
                      {cmd.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={cmd.title}
                      secondary={cmd.description}
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: isSelected 
                          ? CEYLON_ORANGE 
                          : isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
                      }}
                      secondaryTypographyProps={{
                        fontSize: '0.75rem',
                        color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                      }}
                    />
                    {cmd.shortcut && (
                      <Chip
                        size="small"
                        label={`⌘ ${cmd.shortcut}`}
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </ListItem>
                )
              })}
              
              {catIndex < categories.length - 1 && (
                <Divider sx={{ 
                  my: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' 
                }} />
              )}
            </Box>
          ))
        )}
      </Box>

      {/* Footer */}
      <Box sx={{
        px: 2,
        py: 1.5,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
      }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              size="small"
              label="↑↓"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              }}
            />
            <Typography variant="caption" sx={{ 
              fontSize: '0.7rem',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            }}>
              导航
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              size="small"
              label="↵"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              }}
            />
            <Typography variant="caption" sx={{ 
              fontSize: '0.7rem',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            }}>
              选择
            </Typography>
          </Box>
        </Box>
        <Typography variant="caption" sx={{ 
          fontSize: '0.7rem',
          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
        }}>
          ESC 关闭
        </Typography>
      </Box>
    </Dialog>
  )
}

export default CommandPalette
