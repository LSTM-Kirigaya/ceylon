import chalk from 'chalk'
import inquirer from 'inquirer'
import { createApiClient } from '../utils/api'
import { saveConfig } from '../utils/config'

interface VersionView {
  id: string
  project_id: string
  name: string
  description: string | null
  created_at: string
}

export async function listViews(projectId: string): Promise<void> {
  const api = await createApiClient()
  
  console.log(chalk.gray('Fetching version views...\n'))
  
  const response = await api.post('/cli/views', { projectId })
  const views: VersionView[] = response.data.views

  if (views.length === 0) {
    console.log(chalk.yellow('No version views found.'))
    console.log(chalk.gray('Create a version view in the web interface'))
    return
  }

  console.log(chalk.blue('Version Views:\n'))
  
  views.forEach((view, index) => {
    const isLast = index === views.length - 1
    const prefix = isLast ? '└──' : '├──'
    
    console.log(`${prefix} ${chalk.white.bold(view.name)}`)
    console.log(`    ${chalk.gray('ID:')} ${view.id}`)
    if (view.description) {
      console.log(`    ${chalk.gray('Desc:')} ${view.description}`)
    }
    
    if (!isLast) {
      console.log()
    }
  })

  console.log(chalk.gray(`\nTotal: ${views.length} view(s)`))
}

export async function selectView(projectId: string): Promise<string> {
  const api = await createApiClient()
  
  const response = await api.post('/cli/views', { projectId })
  const views: VersionView[] = response.data.views

  if (views.length === 0) {
    throw new Error('No version views found. Please create a view first.')
  }

  const choices = views.map(v => ({
    name: `${v.name} ${chalk.gray(`(${v.id})`)}`,
    value: v.id,
  }))

  const { viewId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'viewId',
      message: 'Select a version view:',
      choices,
    },
  ])

  await saveConfig({ lastViewId: viewId })
  return viewId
}
