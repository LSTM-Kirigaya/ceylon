import chalk from 'chalk'
import inquirer from 'inquirer'
import { createClient } from '@supabase/supabase-js'
import { saveToken, removeToken, getToken, getConfig } from '../utils/config'

const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTU0MDMsImV4cCI6MjA4OTc3MTQwM30.8fmv1ppusEdHEDvEnHGzKgf9g_zsTToyx832BL3yopo'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface UserInfo {
  id: string
  email: string
  display_name?: string
}

export async function login(): Promise<void> {
  console.log(chalk.blue('🔐 Ceylon Login\n'))
  console.log(chalk.gray('Please enter your credentials:\n'))

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
      validate: (input: string) => {
        if (!input) return 'Email is required'
        if (!input.includes('@')) return 'Please enter a valid email'
        return true
      },
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      validate: (input: string) => {
        if (!input) return 'Password is required'
        if (input.length < 8) return 'Password must be at least 8 characters'
        return true
      },
    },
  ])

  console.log(chalk.gray('\nAuthenticating...'))

  const { data, error } = await supabase.auth.signInWithPassword({
    email: answers.email,
    password: answers.password,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.session) {
    throw new Error('Login failed. Please check your credentials.')
  }

  // Save the access token
  await saveToken(data.session.access_token)

  console.log(chalk.green('\n✓ Login successful!'))
  console.log(chalk.gray('Welcome,'), chalk.white(data.user.email))
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.warn(chalk.yellow('Warning:'), error.message)
  }
  await removeToken()
}

export async function getTokenStatus(): Promise<{ authenticated: boolean; user?: UserInfo }> {
  const token = await getToken()
  
  if (!token) {
    return { authenticated: false }
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { authenticated: false }
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || '',
        display_name: user.user_metadata?.display_name,
      },
    }
  } catch {
    return { authenticated: false }
  }
}
