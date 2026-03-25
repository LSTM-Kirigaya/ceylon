#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { login, logout, getTokenStatus } from './commands/auth'
import { listProjects, selectProject } from './commands/projects'
import { listViews, selectView } from './commands/views'
import { listRequirements, createRequirement, updateRequirement, deleteRequirement } from './commands/requirements'
import { getConfig, ensureConfigDir } from './utils/config'

const program = new Command()

program
  .name('ceylon')
  .description('CLI tool for ceylonm - Intelligent Requirements Management')
  .version('1.0.0')

// Auth commands
program
  .command('login')
  .description('Login to ceylonm')
  .action(async () => {
    try {
      await ensureConfigDir()
      await login()
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      process.exit(1)
    }
  })

program
  .command('logout')
  .description('Logout from ceylonm')
  .action(async () => {
    try {
      await logout()
      console.log(chalk.green('✓ Logged out successfully'))
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      process.exit(1)
    }
  })

program
  .command('status')
  .description('Check authentication status')
  .action(async () => {
    try {
      const status = await getTokenStatus()
      if (status.authenticated) {
        console.log(chalk.green('✓ Authenticated'))
        console.log(chalk.gray('User:'), status.user?.email)
      } else {
        console.log(chalk.yellow('✗ Not authenticated'))
        console.log(chalk.gray('Run `ceylon login` to authenticate'))
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      process.exit(1)
    }
  })

// Project commands
program
  .command('projects')
  .description('List all projects')
  .action(async () => {
    try {
      await listProjects()
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      process.exit(1)
    }
  })

// View commands
program
  .command('views')
  .description('List version views for selected project')
  .option('-p, --project <id>', 'Project ID')
  .action(async (options) => {
    try {
      let projectId = options.project
      if (!projectId) {
        projectId = await selectProject()
      }
      await listViews(projectId)
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      process.exit(1)
    }
  })

// Requirement commands
program
  .command('requirements')
  .alias('reqs')
  .description('List requirements')
  .option('-p, --project <id>', 'Project ID')
  .option('-v, --view <id>', 'Version View ID')
  .action(async (options) => {
    try {
      let projectId = options.project
      let viewId = options.view

      // If viewId is provided, we can skip interactive project selection.
      // Only when viewId is missing do we need projectId to select a view.
      if (!viewId) {
        if (!projectId) projectId = await selectProject()
        viewId = await selectView(projectId)
      }

      await listRequirements(viewId)
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      process.exit(1)
    }
  })

program
  .command('create')
  .description('Create a new requirement')
  .option('-p, --project <id>', 'Project ID')
  .option('-v, --view <id>', 'Version View ID')
  .option('-t, --title <title>', 'Requirement title')
  .option('-d, --description <desc>', 'Requirement description')
  .option('--priority <priority>', 'Priority (0-10)', '5')
  .option('--type <type>', 'Type (Bug|Feature|Improvement|Documentation|Security|Discussion)', 'Feature')
  .action(async (options) => {
    try {
      let projectId = options.project
      let viewId = options.view

      // If viewId is provided, we can skip interactive project selection.
      if (!viewId) {
        if (!projectId) projectId = await selectProject()
        viewId = await selectView(projectId)
      }

      await createRequirement(viewId, {
        title: options.title,
        description: options.description,
        priority: parseInt(options.priority),
        type: options.type,
      })
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      process.exit(1)
    }
  })

program
  .command('update')
  .description('Update a requirement')
  .argument('<id>', 'Requirement ID')
  .option('-t, --title <title>', 'Requirement title')
  .option('-d, --description <desc>', 'Requirement description')
  .option('--priority <priority>', 'Priority (0-10)')
  .option('--type <type>', 'Type (Bug|Feature|Improvement|Documentation|Security|Discussion)')
  .option('--status <status>', 'Status (pending|in_progress|completed|rejected)')
  .action(async (id, options) => {
    try {
      await updateRequirement(id, {
        title: options.title,
        description: options.description,
        priority: options.priority ? parseInt(options.priority) : undefined,
        type: options.type,
        status: options.status,
      })
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      process.exit(1)
    }
  })

program
  .command('delete')
  .description('Delete a requirement')
  .argument('<id>', 'Requirement ID')
  .action(async (id) => {
    try {
      await deleteRequirement(id)
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      process.exit(1)
    }
  })

program.parse()
