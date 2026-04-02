import { test, expect } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'

test.describe('Full Workflow Integration', () => {
  test('login and dashboard availability', async ({ page }) => {
    await signInUser(page)
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=所有项目')).toBeVisible()
  })

  test('home CTA should go to dashboard when logged in', async ({ page }) => {
    await signInUser(page)
    await page.goto('/')
    // Allow auth store to hydrate so the CTA recognises the logged-in state
    await page.waitForTimeout(500)

    // "开始项目" / primary CTA (avoid locale-dependent exact text by using the first contained button in hero).
    const cta = page.locator('button').filter({ hasText: /开始|Start|Get started|创建|项目/ }).first()
    await cta.click()

    await expect(page).toHaveURL(/\/dashboard/)
  })
})
