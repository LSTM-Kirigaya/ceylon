'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Box,
  TextField,
  Avatar,
  Typography,
  CircularProgress,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  InputAdornment,
  IconButton,
  ClickAwayListener,
  Paper,
  Chip,
} from '@mui/material'
import {
  Search,
  Close,
  Person,
} from '@mui/icons-material'
import { useThemeStore } from '@/stores/themeStore'
import { Profile } from '@/types'

interface UserSearchProps {
  projectId: string
  selectedUser: Profile | null
  onSelectUser: (user: Profile | null) => void
  placeholder?: string
}

export default function UserSearch({ 
  projectId, 
  selectedUser, 
  onSelectUser,
  placeholder = '搜索用户名或邮箱...'
}: UserSearchProps) {
  const { getEffectiveMode } = useThemeStore()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isDark = getEffectiveMode() === 'dark'

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setUsers([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchQuery)}&projectId=${projectId}`
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setUsers(data.users || [])
      setShowResults(true)
    } catch (err) {
      console.error('Error searching users:', err)
      setError('搜索失败')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(value)
      }, 300)
    } else {
      setUsers([])
      setShowResults(false)
    }
  }

  const handleSelectUser = (user: Profile) => {
    onSelectUser(user)
    setQuery('')
    setUsers([])
    setShowResults(false)
  }

  const handleClear = () => {
    setQuery('')
    setUsers([])
    setShowResults(false)
    onSelectUser(null)
  }

  const handleClickAway = () => {
    setShowResults(false)
  }

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // If a user is selected, show the selected user
  if (selectedUser) {
    return (
      <Box>
        <Typography 
          variant="caption" 
          sx={{ 
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            mb: 1,
            display: 'block',
          }}
        >
          已选择成员
        </Typography>
        <Paper
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: 2,
          }}
        >
          <Avatar
            src={selectedUser.avatar_url || undefined}
            sx={{ 
              width: 40, 
              height: 40,
              backgroundColor: '#C85C1B',
            }}
          >
            {selectedUser.display_name?.[0] || selectedUser.email?.[0]}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: isDark ? 'white' : '#1c1917',
                fontWeight: 600,
              }}
            >
              {selectedUser.display_name || selectedUser.email?.split('@')[0]}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
            >
              {selectedUser.email}
            </Typography>
          </Box>
          <Chip 
            label="已选择" 
            size="small"
            sx={{
              backgroundColor: 'rgba(200, 92, 27, 0.15)',
              color: '#C85C1B',
              fontWeight: 600,
            }}
          />
          <IconButton 
            size="small" 
            onClick={handleClear}
            sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
          >
            <Close />
          </IconButton>
        </Paper>
      </Box>
    )
  }

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{ position: 'relative' }}>
        <TextField
          fullWidth
          placeholder={placeholder}
          value={query}
          onChange={handleQueryChange}
          onFocus={() => {
            if (users.length > 0) {
              setShowResults(true)
            }
          }}
          inputProps={{ 'data-testid': 'user-search-input' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 20, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {loading ? (
                  <CircularProgress size={20} sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }} />
                ) : query ? (
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      setQuery('')
                      setUsers([])
                      setShowResults(false)
                    }}
                    sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                ) : null}
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            },
          }}
        />

        {/* Search Results Dropdown */}
        {showResults && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 1,
              maxHeight: 300,
              overflow: 'auto',
              zIndex: 1000,
              backgroundColor: isDark ? '#1c1917' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: 2,
            }}
          >
            {users.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Person sx={{ fontSize: 40, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', mb: 1 }} />
                <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                  未找到匹配的用户
                </Typography>
                <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
                  尝试使用其他关键词搜索
                </Typography>
              </Box>
            ) : (
              <List sx={{ py: 1 }}>
                {users.map((user) => (
                  <ListItemButton
                    key={user.id}
                    data-testid={`user-search-option-${user.id}`}
                    onClick={() => handleSelectUser(user)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={user.avatar_url || undefined}
                        sx={{ 
                          width: 40, 
                          height: 40,
                          backgroundColor: '#C85C1B',
                        }}
                      >
                        {user.display_name?.[0] || user.email?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: isDark ? 'white' : '#1c1917',
                            fontWeight: 600,
                          }}
                        >
                          {user.display_name || user.email?.split('@')[0]}
                        </Typography>
                      }
                      secondary={
                        <Typography 
                          variant="caption" 
                          sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                        >
                          {user.email}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        )}

        {error && (
          <Typography 
            variant="caption" 
            color="error" 
            sx={{ mt: 1, display: 'block' }}
          >
            {error}
          </Typography>
        )}
      </Box>
    </ClickAwayListener>
  )
}
