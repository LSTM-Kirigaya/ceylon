import { Page } from '@playwright/test'
import { supabase } from './supabase-client'
import { TEST_USER } from './test-data'
import { createServiceClient } from './supabase-client'

/**
 * Authentication helpers for E2E tests
 */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function isRetryableAdminError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  const m = msg.toLowerCase()
  return (
    m.includes('econnreset') ||
    m.includes('fetch failed') ||
    m.includes('network') ||
    m.includes('retryable')
  )
}

async function ensureUserExists(email: string, password: string) {
  const admin = createServiceClient()
  const max = 4
  for (let i = 0; i < max; i++) {
    const ensure = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (!ensure.error) return
    const already = ensure.error.message.toLowerCase().includes('already')
    if (already) return
    if (i < max - 1 && isRetryableAdminError(ensure.error)) {
      await sleep(500 * (i + 1))
      continue
    }
    throw ensure.error
  }
}

export async function signInUser(page: Page, email: string = TEST_USER.email, password: string = TEST_USER.password) {
  await ensureUserExists(email, password)

  // Navigate to login page (if already authenticated, app may redirect to dashboard)
  await page.goto('/login', { waitUntil: 'domcontentloaded' })

  // If already logged in, no-op.
  if (page.url().includes('/dashboard')) return

  const emailSel = 'input[name="email"], input[type="email"]'
  await page.waitForSelector(emailSel, { state: 'visible', timeout: 30_000 })

  // Fill in credentials with stable selectors for the current UI.
  await page.fill(emailSel, email)
  await page.fill('input[name="password"], input[type="password"]', password)

  // Submit and wait for dashboard
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 45000 })
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
