import { test, expect } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await signInUser(page)
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=所有项目')).toBeVisible()
  })

  test('should block unauthenticated dashboard access', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
