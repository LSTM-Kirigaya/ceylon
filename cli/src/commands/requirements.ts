import chalk from 'chalk'
import inquirer from 'inquirer'
import { createApiClient } from '../utils/api'
import { REQUIREMENT_TYPES, REQUIREMENT_STATUS, getPriorityLabel } from '../utils/constants'

interface Requirement {
  id: string
  requirement_number: number
  title: string
  description: string | null
  assignee_id: string | null
  priority: number
  type: string
  status: string
  created_at: string
}

const typeColors: Record<string, string> = {
  'Bug': '#ef4444',
  'Feature': '#22c55e',
  'Improvement': '#3b82f6',
  'Documentation': '#a855f7',
  'Security': '#dc2626',
  'Discussion': '#f59e0b',
}

const statusColors: Record<string, string> = {
  'pending': '#6b7280',
  'in_progress': '#3b82f6',
  'completed': '#22c55e',
  'rejected': '#ef4444',
}

const statusLabels: Record<string, string> = {
  'pending': '待启动',
  'in_progress': '开发中',
  'completed': '已完成',
  'rejected': '已拒绝',
}

const typeLabels: Record<string, string> = {
  'Bug': '缺陷报告',
  'Feature': '功能需求',
  'Improvement': '功能改进',
  'Documentation': '文档缺失',
  'Security': '安全问题',
  'Discussion': '讨论和咨询',
}

export async function listRequirements(viewId: string): Promise<void> {
  const api = await createApiClient()
  
  console.log(chalk.gray('Fetching requirements...\n'))
  
  const response = await api.post('/cli/requirements', { viewId })
  const requirements: Requirement[] = response.data.requirements

  if (requirements.length === 0) {
    console.log(chalk.yellow('No requirements found.'))
    console.log(chalk.gray('Use `ceylonm create` to add requirements'))
    return
  }

  console.log(chalk.blue(`Requirements (${requirements.length}):\n`))
  
  requirements.forEach((req) => {
    const typeColor = typeColors[req.type] || '#6b7280'
    const statusColor = statusColors[req.status] || '#6b7280'
    const priorityColor = getPriorityColor(req.priority)
    
    console.log(`${chalk.gray('#' + req.requirement_number)} ${chalk.white.bold(req.title)}`)
    console.log(`  ${chalk.hex(typeColor)('●')} ${typeLabels[req.type] || req.type}`)
    console.log(`  ${chalk.hex(statusColor)('●')} ${statusLabels[req.status] || req.status}`)
    console.log(`  ${chalk.hex(priorityColor)('●')} ${getPriorityLabel(req.priority)}`)
    if (req.description) {
      console.log(`  ${chalk.gray(req.description)}`)
    }
    console.log(`  ${chalk.gray('ID:')} ${req.id}`)
    console.log()
  })
}

export async function createRequirement(
  viewId: string,
  options: {
    title?: string
    description?: string
    priority?: number
    type?: string
  }
): Promise<void> {
  const api = await createApiClient()
  
  let { title, description, priority, type } = options

  // Interactive prompts for missing fields
  if (!title) {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Requirement title:',
        validate: (input: string) => input.length > 0 || 'Title is required',
      },
    ])
    title = answer.title
  }

  if (!description) {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Description (optional):',
      },
    ])
    description = answer.description
  }

  if (priority === undefined) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'priority',
        message: 'Priority:',
        choices: [
          { name: 'P0 - Critical', value: 0 },
          { name: 'P1 - High', value: 1 },
          { name: 'P2 - High', value: 2 },
          { name: 'P3 - Medium', value: 3 },
          { name: 'P4 - Medium', value: 4 },
          { name: 'P5 - Normal', value: 5 },
          { name: 'P6 - Normal', value: 6 },
          { name: 'P7 - Low', value: 7 },
          { name: 'P8 - Low', value: 8 },
          { name: 'P9 - Lowest', value: 9 },
          { name: 'P10 - Lowest', value: 10 },
        ],
        default: 5,
      },
    ])
    priority = answer.priority
  }

  if (!type) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Type:',
        choices: REQUIREMENT_TYPES.map(t => ({
          name: t.label,
          value: t.value,
        })),
        default: 'Feature',
      },
    ])
    type = answer.type
  }

  console.log(chalk.gray('\nCreating requirement...'))

  const response = await api.post('/cli/requirements/create', {
    viewId,
    title,
    description: description || null,
    priority,
    type,
  })

  const req: Requirement = response.data.requirement

  console.log(chalk.green('\n✓ Requirement created successfully!'))
  console.log(chalk.gray('ID:'), req.id)
  console.log(chalk.gray('Number:'), `#${req.requirement_number}`)
  console.log(chalk.gray('Title:'), req.title)
}

export async function updateRequirement(
  reqId: string,
  options: {
    title?: string
    description?: string
    priority?: number
    type?: string
    status?: string
  }
): Promise<void> {
  const api = await createApiClient()
  
  const updates: any = {}
  
  if (options.title !== undefined) updates.title = options.title
  if (options.description !== undefined) updates.description = options.description
  if (options.priority !== undefined) updates.priority = options.priority
  if (options.type !== undefined) updates.type = options.type
  if (options.status !== undefined) updates.status = options.status

  if (Object.keys(updates).length === 0) {
    console.log(chalk.yellow('No fields to update.'))
    return
  }

  console.log(chalk.gray('Updating requirement...'))

  await api.post('/cli/requirements/update', {
    reqId,
    updates,
  })

  console.log(chalk.green('\n✓ Requirement updated successfully!'))
}

export async function deleteRequirement(reqId: string): Promise<void> {
  const api = await createApiClient()
  
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete requirement ${reqId}?`,
      default: false,
    },
  ])

  if (!confirm) {
    console.log(chalk.gray('Cancelled.'))
    return
  }

  console.log(chalk.gray('Deleting requirement...'))

  await api.post('/cli/requirements/delete', { reqId })

  console.log(chalk.green('\n✓ Requirement deleted successfully!'))
}

function getPriorityColor(priority: number): string {
  if (priority <= 2) return '#dc2626'
  if (priority <= 4) return '#ea580c'
  if (priority <= 6) return '#f59e0b'
  if (priority <= 8) return '#3b82f6'
  return '#6b7280'
}
