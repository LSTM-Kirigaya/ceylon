import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { signInUser } from '../utils/auth-helper'

test.describe('Profile', () => {
  test('should open profile page after login', async ({ page }) => {
    await signInUser(page)
    const sess = await page.request.get('/api/auth/session')
    expect(sess.ok()).toBeTruthy()
    const sessJson = await sess.json()
    expect(sessJson.user).toBeTruthy()
    expect(sessJson.profile).toBeTruthy()
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: '个人资料' })).toBeVisible({ timeout: 30_000 })
  })

  test('should update display name', async ({ page }) => {
    await signInUser(page)
    await page.goto('/profile')

    const newName = `E2E_User_${Date.now()}`
    await page.getByLabel('昵称').fill(newName)
    await page.getByRole('button', { name: '保存修改' }).click()

    // Either success message or server-side validation error.
    await page.waitForSelector('.MuiAlert-message', { timeout: 30_000 })
    await expect(page.getByText('个人资料已保存')).toBeVisible({ timeout: 30_000 })
  })

  test('should upload avatar', async ({ page }) => {
    await signInUser(page)
    await page.goto('/profile')

    // 1x1 transparent PNG
    const base64Png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X6e8AAAAASUVORK5CYII='

    const tmpDir = path.join(__dirname, '..', '..', 'test-results', 'tmp')
    const filePath = path.join(tmpDir, `avatar_${Date.now()}.png`)
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(filePath, Buffer.from(base64Png, 'base64'))

    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByText('头像上传成功')).toBeVisible({ timeout: 30_000 })
  })
})

