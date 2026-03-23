import chalk from 'chalk'
import inquirer from 'inquirer'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { saveToken, removeToken, getToken } from '../utils/config'

function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY (or legacy NEXT_PUBLIC_*) in your environment.')
  }
  return createClient(url, key)
}

interface UserInfo {
  id: string
  email: string
  display_name?: string
}

export async function login(): Promise<void> {
  const supabase = getSupabaseClient()
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

  await saveToken(data.session.access_token)

  console.log(chalk.green('\n✓ Login successful!'))
  console.log(chalk.gray('Welcome,'), chalk.white(data.user.email))
}

export async function logout(): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.warn(chalk.yellow('Warning:'), error.message)
  }
  await removeToken()
}

export async function getTokenStatus(): Promise<{ authenticated: boolean; user?: UserInfo }> {
  const supabase = getSupabaseClient()
  const token = await getToken()

  if (!token) {
    return { authenticated: false }
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

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
