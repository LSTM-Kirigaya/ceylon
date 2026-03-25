import { test, expect } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'

test.describe('Full Workflow Integration', () => {
  test('login and dashboard availability', async ({ page }) => {
    await signInUser(page)
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=所有项目')).toBeVisible()
  })
})
