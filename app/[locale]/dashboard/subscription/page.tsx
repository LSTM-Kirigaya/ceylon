'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Container,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
} from '@mui/material'
import {
  Check,
  Star,
  Receipt,
  ArrowForward,
} from '@mui/icons-material'
import { useThemeStore, CEYLON_ORANGE } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import MainLayout from '@/components/MainLayout'

// 订阅计划数据
const plans = [
  {
    id: 'free',
    name: '免费版',
    price: '0',
    description: '适合个人体验和轻度使用',
    features: ['最多 3 个项目', '基础功能', '社区支持'],
    current: true,
  },
  {
    id: 'pro',
    name: '专业版',
    price: '29',
    description: '适合自由职业者和小团队',
    features: ['无限项目', '高级功能', '优先支持', '数据分析', 'API 访问'],
    current: false,
    popular: true,
  },
  {
    id: 'team',
    name: '团队版',
    price: '99',
    description: '适合大型团队和协作需求',
    features: ['所有专业版功能', '团队协作', '管理员控制台', 'SSO 登录', '专属客服'],
    current: false,
  },
]

// 模拟账单历史
const invoices = [
  { id: 'INV-001', date: '2026-03-01', amount: '¥0', status: '免费' },
  { id: 'INV-002', date: '2026-02-01', amount: '¥0', status: '免费' },
]

export default function SubscriptionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const router = useRouter()
  const { getEffectiveMode } = useThemeStore()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState<string | null>(null)

  const effectiveMode = getEffectiveMode()
  const isDark = effectiveMode === 'dark'

  const currentPlan = plans.find(p => p.current) || plans[0]

  const handleUpgrade = async (planId: string) => {
    setLoading(planId)
    // TODO: 集成支付系统
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(null)
    alert('功能开发中，敬请期待！')
  }

  return (
    <MainLayout>
      <Box sx={{ 
        minHeight: 'calc(100vh - 56px)',
        backgroundColor: isDark ? '#0a0a0a' : '#fafafa',
      }}>
        {/* Header Section */}
        <Box sx={{ 
          p: { xs: 2, md: 3 },
          pb: 2,
          backgroundColor: isDark ? '#0c0a09' : '#ffffff',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}>
          <Container maxWidth={false}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: { xs: 'flex-start', md: 'center' }, 
              justifyContent: 'space-between',
              gap: 2,
              flexDirection: { xs: 'column', md: 'row' },
            }}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.25rem', md: '1.5rem' },
                    color: isDark ? 'white' : '#1c1917',
                    mb: 0.5,
                  }}
                >
                  订阅管理
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  }}
                >
                  管理你的订阅计划和账单
                </Typography>
              </Box>

              {/* 当前状态标签 */}
              <Chip
                icon={<Star sx={{ fontSize: 16 }} />}
                label={`当前方案：${currentPlan.name}`}
                sx={{
                  backgroundColor: isDark ? `${CEYLON_ORANGE}30` : `${CEYLON_ORANGE}15`,
                  color: CEYLON_ORANGE,
                  fontWeight: 600,
                  '& .MuiChip-icon': {
                    color: CEYLON_ORANGE,
                  },
                }}
              />
            </Box>
          </Container>
        </Box>

        {/* Content */}
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Container maxWidth={false}>
            {/* 当前订阅卡片 */}
            <Card
              sx={{
                mb: 3,
                borderRadius: 2,
                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', md: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', md: 'center' },
                  gap: 2,
                }}>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: isDark ? 'white' : '#1c1917',
                        mb: 0.5,
                      }}
                    >
                      {currentPlan.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                      }}
                    >
                      免费使用，无需付费
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: isDark ? 'white' : '#1c1917',
                      }}
                    >
                      ¥{currentPlan.price}
                      <Typography component="span" sx={{ fontSize: '0.875rem', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                        /月
                      </Typography>
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {currentPlan.features.map((feature, index) => (
                    <Chip
                      key={index}
                      icon={<Check sx={{ fontSize: 16 }} />}
                      label={feature}
                      size="small"
                      sx={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                        '& .MuiChip-icon': {
                          color: CEYLON_ORANGE,
                        },
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* 升级选项 */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: isDark ? 'white' : '#1c1917',
                mb: 2,
              }}
            >
              升级选项
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2,
                mb: 4,
              }}
            >
              {plans.filter(p => !p.current).map((plan) => (
                <Paper
                  key={plan.id}
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    backgroundColor: isDark ? '#1c1917' : '#ffffff',
                    border: `1px solid ${plan.popular ? CEYLON_ORANGE : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    position: 'relative',
                    ...(plan.popular && {
                      boxShadow: isDark 
                        ? `0 0 0 1px ${CEYLON_ORANGE}40` 
                        : `0 0 0 1px ${CEYLON_ORANGE}30`,
                    }),
                  }}
                >
                  {plan.popular && (
                    <Chip
                      label="最受欢迎"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        backgroundColor: CEYLON_ORANGE,
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: isDark ? 'white' : '#1c1917',
                      mb: 0.5,
                    }}
                  >
                    {plan.name}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                      mb: 2,
                    }}
                  >
                    {plan.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: isDark ? 'white' : '#1c1917',
                      }}
                    >
                      ¥{plan.price}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                      }}
                    >
                      /月
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    {plan.features.map((feature, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          py: 0.5,
                          color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
                        }}
                      >
                        <Check sx={{ fontSize: 16, color: CEYLON_ORANGE }} />
                        <Typography variant="body2">{feature}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    fullWidth
                    variant={plan.popular ? 'contained' : 'outlined'}
                    onClick={() => handleUpgrade(plan.id)}
                    loading={loading === plan.id}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      ...(plan.popular
                        ? {
                            backgroundColor: CEYLON_ORANGE,
                            '&:hover': { backgroundColor: '#A34712' },
                          }
                        : {
                            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                            color: isDark ? 'white' : '#1c1917',
                            '&:hover': {
                              borderColor: CEYLON_ORANGE,
                              color: CEYLON_ORANGE,
                            },
                          }),
                    }}
                  >
                    升级
                  </Button>
                </Paper>
              ))}
            </Box>

            {/* 账单历史 */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: isDark ? 'white' : '#1c1917',
                mb: 2,
              }}
            >
              账单历史
            </Typography>

            <Card
              sx={{
                borderRadius: 2,
                backgroundColor: isDark ? '#1c1917' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                boxShadow: 'none',
              }}
            >
              <List sx={{ py: 0 }}>
                {invoices.map((invoice, index) => (
                  <Box key={invoice.id}>
                    <ListItem
                      sx={{
                        py: 2,
                        px: 3,
                        '&:hover': {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        },
                      }}
                      secondaryAction={
                        <Button
                          size="small"
                          startIcon={<Receipt sx={{ fontSize: 16 }} />}
                          sx={{
                            textTransform: 'none',
                            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                            '&:hover': {
                              color: CEYLON_ORANGE,
                            },
                          }}
                          onClick={() => alert('功能开发中！')}
                        >
                          查看
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 500,
                                color: isDark ? 'white' : '#1c1917',
                              }}
                            >
                              {invoice.id}
                            </Typography>
                            <Chip
                              label={invoice.status}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            sx={{
                              color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                            }}
                          >
                            {invoice.date}
                          </Typography>
                        }
                      />
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: isDark ? 'white' : '#1c1917',
                          mr: 8,
                        }}
                      >
                        {invoice.amount}
                      </Typography>
                    </ListItem>
                    {index < invoices.length - 1 && (
                      <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                    )}
                  </Box>
                ))}
              </List>
            </Card>

            {/* 帮助链接 */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button
                endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                onClick={() => router.push(`/${locale}/pricing`)}
                sx={{
                  textTransform: 'none',
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  '&:hover': {
                    color: CEYLON_ORANGE,
                  },
                }}
              >
                查看详细定价页面
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>
    </MainLayout>
  )
}
