'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Container,
  Breadcrumbs,
  Link,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import {
  ChevronRight,
  Language,
  DarkMode,
  Delete,
  Logout,
  Warning,
} from '@mui/icons-material'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { CEYLON_ORANGE } from '@/stores/themeStore'
import MainLayout from '@/components/MainLayout'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function SettingsPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations()
  const { signOut } = useAuthStore()
  const { mode, setMode, getEffectiveMode } = useThemeStore()
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isDark = getEffectiveMode() === 'dark'

  const handleLogout = async () => {
    await signOut()
    router.push(`/${locale}/login`)
  }

  const handleDeleteAccount = async () => {
    // This would require a server-side API to properly delete the user
    // For now, just show a message
    setMessage({ type: 'error', text: '账户删除功能请联系管理员' })
    setDeleteDialogOpen(false)
    setDeleteConfirmText('')
  }

  const settingsGroups = [
    {
      title: '外观',
      items: [
        {
          icon: <Language sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }} />,
          title: '语言',
          description: '选择界面显示语言',
          action: <LanguageSwitcher />,
        },
        {
          icon: <DarkMode sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }} />,
          title: '主题',
          description: `当前: ${mode === 'light' ? '浅色' : mode === 'dark' ? '深色' : '跟随系统'}`,
          action: (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
              sx={{
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                color: isDark ? 'white' : '#1c1917',
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              切换
            </Button>
          ),
        },
      ],
    },
    {
      title: '账户',
      items: [
        {
          icon: <Logout sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }} />,
          title: '退出登录',
          description: '退出当前账户',
          action: (
            <Button
              variant="outlined"
              size="small"
              onClick={handleLogout}
              sx={{
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                color: isDark ? 'white' : '#1c1917',
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              退出
            </Button>
          ),
        },
      ],
    },
    {
      title: '危险操作',
      danger: true,
      items: [
        {
          icon: <Delete sx={{ color: '#ef4444' }} />,
          title: '删除账户',
          titleColor: '#ef4444',
          description: '永久删除你的账户和所有数据',
          action: (
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={() => setDeleteDialogOpen(true)}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              删除
            </Button>
          ),
        },
      ],
    },
  ]

  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ p: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs 
          separator={<ChevronRight sx={{ fontSize: 16, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} />}
          sx={{ mb: 2 }}
        >
          <Link
            href={`/${locale}/dashboard`}
            style={{
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            {t('nav.dashboard')}
          </Link>
          <Typography sx={{ color: isDark ? 'white' : '#1c1917', fontSize: '0.9rem' }}>
            {t('common.settings')}
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
              fontSize: '1.75rem',
            }}
          >
            {t('common.settings')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 0.5,
              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              fontSize: '0.95rem',
            }}
          >
            管理应用偏好和账户设置
          </Typography>
        </Box>

        {message && (
          <Alert
            severity={message.type}
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        {/* Settings Groups */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {settingsGroups.map((group, groupIndex) => (
            <Card
              key={group.title}
              sx={{
                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                borderRadius: 2,
                border: `1px solid ${group.danger 
                  ? (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)')
                  : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')}`,
                boxShadow: 'none',
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ 
                  p: 3, 
                  borderBottom: `1px solid ${group.danger 
                    ? (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)')
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')}`,
                }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: group.danger ? '#ef4444' : (isDark ? 'white' : '#1c1917'), 
                      fontWeight: 600, 
                      fontSize: '1rem' 
                    }}
                  >
                    {group.title}
                  </Typography>
                </Box>
                <List sx={{ py: 0 }}>
                  {group.items.map((item, itemIndex) => (
                    <Box key={item.title}>
                      <ListItem
                        sx={{
                          py: 2,
                          px: 3,
                          '&:hover': {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 44 }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              variant="subtitle2"
                              sx={{
                                color: (item as any).titleColor || (isDark ? 'white' : '#1c1917'),
                                fontWeight: 600,
                                fontSize: '0.95rem',
                              }}
                            >
                              {item.title}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="body2"
                              sx={{
                                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                                fontSize: '0.85rem',
                              }}
                            >
                              {item.description}
                            </Typography>
                          }
                        />
                        <Box sx={{ ml: 2 }}>
                          {item.action}
                        </Box>
                      </ListItem>
                      {itemIndex < group.items.length - 1 && (
                        <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                      )}
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Delete Account Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false)
            setDeleteConfirmText('')
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: isDark ? '#1c1917' : '#ffffff',
              borderRadius: 2,
            },
          }}
        >
          <DialogTitle sx={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning />
            删除账户
          </DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              此操作不可逆！删除后所有数据将被永久删除。
            </Alert>
            <Typography variant="body2" sx={{ mb: 2, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
              请输入 &quot;DELETE&quot; 以确认删除账户
            </Typography>
            <TextField
              fullWidth
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="输入 DELETE"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteConfirmText('')
              }}
              sx={{
                textTransform: 'none',
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleDeleteAccount}
              variant="contained"
              color="error"
              disabled={deleteConfirmText !== 'DELETE'}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
              }}
            >
              确认删除
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  )
}
