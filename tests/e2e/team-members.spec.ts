import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { globalCleanup } from '../utils/cleanup'
import { generateTestId } from '../utils/test-data'
import { signInUser } from '../utils/auth-helper'

test.describe('Team Members Management', () => {
  test.describe.configure({ mode: 'serial' })

  const service = createServiceClient()
  let ownerEmail = ''
  let ownerPassword = 'testpassword123'
  let projectId = ''
  let searchUserId = ''
  let searchUserEmail = ''

  test.beforeAll(async () => {
    const id = generateTestId()
    ownerEmail = `team_owner_${id}@example.com`

    const { data: ownerRes, error: ownerErr } = await service.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { display_name: `TeamOwner_${id}` },
    })
    if (ownerErr) throw ownerErr

    const ownerId = ownerRes.user?.id
    if (!ownerId) throw new Error('owner create failed')
    globalCleanup.trackUser(ownerId)

    const { data: p, error: pErr } = await service
      .from('projects')
      .insert({ name: `Team Project ${id}`, owner_id: ownerId })
      .select()
      .single()
    if (pErr || !p) throw pErr || new Error('project create failed')
    projectId = p.id
    globalCleanup.trackProject(projectId)

    const searchUserName = `TeamSearchUser_${id}`
    searchUserEmail = `team_search_${id}@example.com`
    const { data: searchRes, error: searchErr } = await service.auth.admin.createUser({
      email: searchUserEmail,
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: { display_name: searchUserName },
    })
    if (searchErr) throw searchErr
    const sid = searchRes.user?.id
    if (!sid) throw new Error('search user create failed')
    searchUserId = sid
    globalCleanup.trackUser(searchUserId)

    // Ensure profile name is searchable from profiles table.
    await service.from('profiles').update({ display_name: searchUserName }).eq('id', searchUserId)
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('team button should navigate to team route', async ({ page }) => {
    await signInUser(page, ownerEmail, ownerPassword)
    await page.goto(`/dashboard/project/${projectId}`)
    await page.click('button:has-text("团队成员")')
    await expect(page).toHaveURL(new RegExp(`/dashboard/project/${projectId}/team`))
  })

  test('should search user by nickname and email via API', async ({ page }) => {
    await signInUser(page, ownerEmail, ownerPassword)

    const byName = await page.request.get(`/api/users/search?q=${encodeURIComponent('TeamSearchUser_')}&projectId=${projectId}`)
    expect(byName.ok()).toBeTruthy()
    const byNameJson = await byName.json()
    expect(Array.isArray(byNameJson.users)).toBeTruthy()
    expect(byNameJson.users.length).toBeGreaterThan(0)

    const byEmail = await page.request.get(`/api/users/search?q=${encodeURIComponent('team_search_')}&projectId=${projectId}`)
    expect(byEmail.ok()).toBeTruthy()
    const byEmailJson = await byEmail.json()
    expect(Array.isArray(byEmailJson.users)).toBeTruthy()
    expect(byEmailJson.users.length).toBeGreaterThan(0)
  })

  test('should search user by full user id (UUID) via API', async ({ page }) => {
    await signInUser(page, ownerEmail, ownerPassword)

    const res = await page.request.get(
      `/api/users/search?q=${encodeURIComponent(searchUserId)}&projectId=${projectId}`
    )
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.users.some((u: { id: string }) => u.id === searchUserId)).toBeTruthy()
  })

  test('should search in invite dialog and invite user from team page', async ({ page }) => {
    await signInUser(page, ownerEmail, ownerPassword)
    await page.goto(`/dashboard/project/${projectId}/team`)

    await expect(page.getByTestId('team-open-invite')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('team-open-invite').click()
    await page.getByTestId('user-search-input').fill(searchUserEmail.split('@')[0])

    await expect(page.getByTestId(`user-search-option-${searchUserId}`)).toBeVisible({ timeout: 25_000 })
    await page.getByTestId(`user-search-option-${searchUserId}`).click()

    await page.getByTestId('team-submit-invite').click()

    await expect(page.getByText(searchUserEmail, { exact: true })).toBeVisible({ timeout: 25_000 })
  })
})
