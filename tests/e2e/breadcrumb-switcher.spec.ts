import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { globalCleanup } from '../utils/cleanup'
import { generateTestId } from '../utils/test-data'
import { signInUser } from '../utils/auth-helper'

test.describe('Breadcrumb switchers', () => {
  test.describe.configure({ mode: 'serial' })

  const service = createServiceClient()
  let email = ''
  const password = 'testpassword123'
  let userId = ''
  let projectId = ''
  let viewId = ''

  test.beforeAll(async () => {
    const id = generateTestId()
    email = `breadcrumb_${id}@example.com`

    const { data: u, error: uErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `Breadcrumb_${id}` },
    })
    if (uErr) throw uErr
    userId = u.user?.id ?? ''
    if (!userId) throw new Error('user create failed')
    globalCleanup.trackUser(userId)

    const { data: p, error: pErr } = await service
      .from('projects')
      .insert({ name: `Breadcrumb Project ${id}`, owner_id: userId })
      .select()
      .single()
    if (pErr || !p) throw pErr || new Error('project create failed')
    projectId = p.id
    globalCleanup.trackProject(projectId)

    const { data: v, error: vErr } = await service
      .from('version_views')
      .insert({ project_id: projectId, name: `Breadcrumb View ${id}`, description: null })
      .select()
      .single()
    if (vErr || !v) throw vErr || new Error('view create failed')
    viewId = v.id

    // version_views cleanup is handled via project cascade or manual cleanup in helper
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('can open project & view dropdowns and navigate', async ({ page }) => {
    await signInUser(page, email, password)

    await page.goto(`/dashboard/project/${projectId}/view/${viewId}`)
    await expect(page.getByTestId('version-view-page')).toBeVisible({ timeout: 30_000 })

    // Project switcher
    await expect(page.getByTestId('breadcrumb-project-switcher').first()).toBeVisible()
    await page.getByTestId('breadcrumb-project-switcher').first().click()
    await expect(page.getByTestId('breadcrumb-project-current')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('breadcrumb-project-action-create')).toBeVisible()
    await expect(page.getByTestId('breadcrumb-project-action-manage')).toBeVisible()
    await expect(page.getByTestId(`breadcrumb-project-item-${projectId}`)).toBeVisible({ timeout: 30_000 })
    // Close the menu so it doesn't intercept clicks.
    await page.keyboard.press('Escape')

    // View switcher
    await page.getByTestId('breadcrumb-view-switcher').first().click()
    await expect(page.getByTestId('breadcrumb-view-current')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('breadcrumb-view-action-create')).toBeVisible()
    await expect(page.getByTestId('breadcrumb-view-action-manage')).toBeVisible()
    await expect(page.getByTestId(`breadcrumb-view-item-${viewId}`)).toBeVisible({ timeout: 30_000 })

    // Navigate via view menu (re-click current item is OK; just ensure it closes and URL remains valid)
    await page.getByTestId(`breadcrumb-view-item-${viewId}`).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/project/${projectId}/view/${viewId}`))
  })
})

