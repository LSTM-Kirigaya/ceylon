import chalk from 'chalk'
import inquirer from 'inquirer'
import { createApiClient } from '../utils/api'
import { saveConfig } from '../utils/config'

interface Project {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
}

export async function listProjects(): Promise<void> {
  const api = await createApiClient()
  
  console.log(chalk.gray('Fetching projects...\n'))
  
  const response = await api.post('/cli/projects')
  const projects: Project[] = response.data.projects

  if (projects.length === 0) {
    console.log(chalk.yellow('No projects found.'))
    console.log(chalk.gray('Create a project at http://localhost:3000/dashboard'))
    return
  }

  console.log(chalk.blue('Your Projects:\n'))
  
  projects.forEach((project, index) => {
    const isLast = index === projects.length - 1
    const prefix = isLast ? '└──' : '├──'
    
    console.log(`${prefix} ${chalk.white.bold(project.name)}`)
    console.log(`    ${chalk.gray('ID:')} ${project.id}`)
    if (project.description) {
      console.log(`    ${chalk.gray('Desc:')} ${project.description}`)
    }
    console.log(`    ${chalk.gray('Created:')} ${new Date(project.created_at).toLocaleDateString()}`)
    
    if (!isLast) {
      console.log()
    }
  })

  console.log(chalk.gray(`\nTotal: ${projects.length} project(s)`))
}

export async function selectProject(): Promise<string> {
  const api = await createApiClient()
  
  const response = await api.post('/cli/projects')
  const projects: Project[] = response.data.projects

  if (projects.length === 0) {
    throw new Error('No projects found. Please create a project first.')
  }

  const choices = projects.map(p => ({
    name: `${p.name} ${chalk.gray(`(${p.id})`)}`,
    value: p.id,
  }))

  const { projectId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'projectId',
      message: 'Select a project:',
      choices,
    },
  ])

  await saveConfig({ lastProjectId: projectId })
  return projectId
}
