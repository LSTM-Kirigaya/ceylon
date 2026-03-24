export type UserRole = 'admin' | 'super_user' | 'user'
export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  subscription_tier: SubscriptionTier
  subscription_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'read' | 'write' | 'admin'
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface VersionView {
  id: string
  project_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type RequirementType = 'Bug' | 'Feature' | 'Improvement' | 'Documentation' | 'Security' | 'Discussion'
export type RequirementStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'

export interface Requirement {
  id: string
  version_view_id: string
  requirement_number: number
  title: string
  description: string | null
  assignee_id: string | null
  priority: number
  type: RequirementType
  status: RequirementStatus
  created_by: string
  created_at: string
  updated_at: string
  /** Dynamic column values keyed by version_view_columns.id */
  custom_values?: Record<string, string | null>
  assignee?: Profile
}

export type VersionViewColumnType = 'text' | 'select' | 'person'

export interface VersionViewColumn {
  id: string
  version_view_id: string
  name: string
  field_type: VersionViewColumnType
  options: string[]
  position: number
  created_at: string
  updated_at: string
}

export interface CliToken {
  id: string
  user_id: string
  token: string
  name: string
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

export const REQUIREMENT_TYPES: { value: RequirementType; label: string; color: string }[] = [
  { value: 'Bug', label: '缺陷报告', color: '#ef4444' },
  { value: 'Feature', label: '功能需求', color: '#22c55e' },
  { value: 'Improvement', label: '功能改进', color: '#3b82f6' },
  { value: 'Documentation', label: '文档缺失', color: '#a855f7' },
  { value: 'Security', label: '安全问题', color: '#dc2626' },
  { value: 'Discussion', label: '讨论和咨询', color: '#f59e0b' },
]

export const REQUIREMENT_STATUS: { value: RequirementStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待启动', color: '#6b7280' },
  { value: 'in_progress', label: '开发中', color: '#3b82f6' },
  { value: 'completed', label: '已完成', color: '#22c55e' },
  { value: 'rejected', label: '已拒绝', color: '#ef4444' },
]

export function getPriorityLabel(priority: number): string {
  return `P${priority}`
}

export function getPriorityColor(priority: number): string {
  if (priority <= 2) return '#dc2626'
  if (priority <= 4) return '#ea580c'
  if (priority <= 6) return '#f59e0b'
  if (priority <= 8) return '#3b82f6'
  return '#6b7280'
}

// User Role definitions
export const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: '管理员', description: '系统管理员，拥有所有权限' },
  { value: 'super_user', label: '高级用户', description: '高级用户，拥有更多权限' },
  { value: 'user', label: '普通用户', description: '普通用户，标准权限' },
]

// Subscription Tier definitions
export const SUBSCRIPTION_TIERS: { value: SubscriptionTier; label: string; description: string; price: number }[] = [
  { value: 'free', label: '免费版', description: '适合个人开发者', price: 0 },
  { value: 'pro', label: '专业版', description: '适合小型团队', price: 10 },
  { value: 'team', label: '团队版', description: '适合专业团队', price: 20 },
  { value: 'enterprise', label: '企业版', description: '适合大型企业', price: 0 },
]

// Helper function to get role label
export function getRoleLabel(role: UserRole): string {
  return USER_ROLES.find(r => r.value === role)?.label || role
}

// Helper function to get subscription tier label
export function getSubscriptionTierLabel(tier: SubscriptionTier): string {
  return SUBSCRIPTION_TIERS.find(t => t.value === tier)?.label || tier
}

// Helper function to check if user is admin
export function isAdmin(role: UserRole): boolean {
  return role === 'admin' || role === 'super_user'
}
