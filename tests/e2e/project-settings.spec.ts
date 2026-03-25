import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { createServiceClient } from '../utils/supabase-client'
import { globalCleanup } from '../utils/cleanup'
import { generateTestId } from '../utils/test-data'
import { signInUser } from '../utils/auth-helper'

test.describe('Project Settings', () => {
  test.describe.configure({ mode: 'serial' })

  const service = createServiceClient()
  let ownerEmail = ''
  const ownerPassword = 'testpassword123'
  let projectId = ''

  test.beforeAll(async () => {
    const id = generateTestId()
    ownerEmail = `proj_owner_${id}@example.com`

    const { data: ownerRes, error: ownerErr } = await service.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { display_name: `ProjOwner_${id}` },
    })
    if (ownerErr) throw ownerErr
    const ownerId = ownerRes.user?.id
    if (!ownerId) throw new Error('owner create failed')
    globalCleanup.trackUser(ownerId)

    const { data: p, error: pErr } = await service
      .from('projects')
      .insert({ name: `Proj_${id}`, description: `Desc_${id}`, owner_id: ownerId, icon_url: null })
      .select()
      .single()
    if (pErr || !p) throw pErr || new Error('project create failed')

    projectId = p.id
    globalCleanup.trackProject(projectId)
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('should upload project icon from settings page', async ({ page }) => {
    await signInUser(page, ownerEmail, ownerPassword)
    await page.goto(`/dashboard/project/${projectId}/settings`)

    await expect(page.getByRole('heading', { name: '项目设置' })).toBeVisible({ timeout: 30_000 })

    // Sanity check: storage RLS uses auth.uid() and projects.owner_id.
    const sessRes = await page.request.get('/api/auth/session')
    expect(sessRes.ok()).toBeTruthy()
    const sessJson = await sessRes.json()
    expect(sessJson.user?.id).toBeTruthy()

    const projRes = await page.request.get(`/api/projects/${projectId}`)
    expect(projRes.ok()).toBeTruthy()
    const projJson = await projRes.json()
    expect(projJson.project?.owner_id).toBe(sessJson.user.id)

    // 1x1 transparent PNG
    const base64Png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X6e8AAAAASUVORK5CYII='

    const tmpDir = path.join(__dirname, '..', '..', 'test-results', 'tmp')
    const filePath = path.join(tmpDir, `proj_icon_${Date.now()}.png`)
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(filePath, Buffer.from(base64Png, 'base64'))

    await page.getByTestId('project-icon-uploader-input').setInputFiles(filePath)

    const img = page.getByTestId('project-icon-preview-img')
    await expect(img).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: '保存更改' }).click()

    const alertMsg = page.locator('.MuiAlert-message')
    await expect(alertMsg).toBeVisible({ timeout: 30_000 })
    const alertText = (await alertMsg.innerText()).trim()
    if (alertText !== '成功') {
      throw new Error(`Expected success but got alert text: ${alertText}`)
    }

    // The saved icon_url should become a public URL (not a blob: object URL).
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="project-icon-preview-img"]') as HTMLImageElement | null
      if (!el) return false
      const src = el.getAttribute('src') || ''
      return src.startsWith('http://') || src.startsWith('https://')
    }, null)

    const src = await img.getAttribute('src')
    expect(src).toBeTruthy()
    expect(src).toMatch(/^https?:\/\//)
  })

  test('breadcrumb should not include invalid "项目" link', async ({ page }) => {
    await signInUser(page, ownerEmail, ownerPassword)
    await page.goto(`/dashboard/project/${projectId}/settings`)
    await expect(page.getByRole('heading', { name: '项目设置' })).toBeVisible({ timeout: 30_000 })

    // Previously, the breadcrumb would include a clickable "项目" that linked to a non-existent route (/dashboard/project) => 404.
    await expect(page.getByRole('link', { name: '项目' })).toHaveCount(0)
    await expect(page.getByText('页面未找到')).toHaveCount(0)
  })
})

