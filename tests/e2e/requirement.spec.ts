import { test, expect } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'

test.describe('Requirement Management', () => {
  test('requirements entry path should be reachable', async ({ page }) => {
    await signInUser(page)
    // App is locale-routed under `app/[locale]/...`
    await page.goto('/zh/dashboard')
    await expect(page.locator('text=所有项目')).toBeVisible()
  })
})
