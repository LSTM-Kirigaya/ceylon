import { Page } from '@playwright/test'
import { supabase } from './supabase-client'
import { TEST_USER } from './test-data'

/**
 * Authentication helpers for E2E tests
 */

export async function signInUser(page: Page, email: string = TEST_USER.email, password: string = TEST_USER.password) {
  // Navigate to login page
  await page.goto('/login')
  
  // Fill in credentials
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  
  // Click login button
  await page.click('button[type="submit"]')
  
  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 })
}

export async function signUpUser(page: Page, email: string, password: string, displayName: string) {
  await page.goto('/register')
  
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.fill('input[name="displayName"]', displayName)
  
  await page.click('button[type="submit"]')
  
  // Wait for email verification or dashboard
  await page.waitForTimeout(2000)
}

export async function signOutUser(page: Page) {
  // Click on user avatar to open menu
  await page.click('[data-testid="user-avatar"]')
  
  // Click logout
  await page.click('text=退出登录')
  
  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 10000 })
}

export async function getAuthToken(email: string, password: string): Promise<string | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error || !data.session) {
    return null
  }
  
  return data.session.access_token
}

export async function createTestUser(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  })
  
  if (error) {
    throw error
  }
  
  return data.user
}
