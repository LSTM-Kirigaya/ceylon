export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
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
  assignee?: Profile
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
