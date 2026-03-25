import { test, expect } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'

test.describe('Version View Management', () => {
  test('project details area should be reachable', async ({ page }) => {
    await signInUser(page)
    await page.goto('/dashboard')
    await expect(page.locator('text=所有项目')).toBeVisible()
  })
})
