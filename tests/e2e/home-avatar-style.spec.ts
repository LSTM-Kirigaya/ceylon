import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { globalCleanup } from '../utils/cleanup'
import { generateTestId } from '../utils/test-data'
import { signInUser } from '../utils/auth-helper'

test.describe('Home avatar style', () => {
  const service = createServiceClient()
  let email = ''
  const password = 'testpassword123'
  let userId = ''

  test.beforeAll(async () => {
    const id = generateTestId()
    email = `home_avatar_${id}@example.com`
    const res = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `HomeAvatar_${id}` },
    })
    if (res.error) throw res.error
    userId = res.data.user?.id ?? ''
    if (!userId) throw new Error('user creation failed')
    globalCleanup.trackUser(userId)
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('home user avatar should have 2px border', async ({ page }) => {
    await signInUser(page, email, password)

    await page.goto('/')
    await page.waitForSelector('[data-testid="home-user-avatar"]', { timeout: 30_000 })

    const borderTopWidth = await page.locator('[data-testid="home-user-avatar"]').evaluate((el) => {
      return window.getComputedStyle(el as HTMLElement).borderTopWidth
    })

    expect(borderTopWidth).toBe('2px')
  })
})

