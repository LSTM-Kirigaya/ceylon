import { test, expect } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'
import { createTestProjectData, createTestVersionViewData } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

test.describe('Version View Management', () => {
  let projectId: string | null = null

  test.beforeEach(async ({ page }) => {
    await signInUser(page)
    
    // Create a test project if not exists
    if (!projectId) {
      const projectData = createTestProjectData()
      await page.click('text=New Project')
      await page.fill('input[name="name"]', projectData.name)
      await page.click('button:has-text("Create Project")')
      
      // Navigate to project and extract ID
      await page.locator(`text=${projectData.name}`).click()
      await page.waitForURL(/\/projects\/[\w-]+/)
      
      const url = page.url()
      projectId = url.split('/').pop() || null
      
      if (projectId) {
        globalCleanup.trackProject(projectId)
      }
    }
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('should create a new version view', async ({ page }) => {
    const viewData = createTestVersionViewData()
    
    // Navigate to project
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Click to create new view
    await page.click('button[aria-label="Create view"]')
    
    // Fill view details
    await page.fill('input[name="name"]', viewData.name)
    await page.fill('textarea[name="description"]', viewData.description)
    
    // Submit
    await page.click('button:has-text("Create")')
    
    // Verify view was created
    await expect(page.locator(`text=${viewData.name}`)).toBeVisible()
  })

  test('should display version views list', async ({ page }) => {
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Check for views section
    await expect(page.locator('text=Views')).toBeVisible()
    
    // Verify create view button exists
    await expect(page.locator('button[aria-label="Create view"]')).toBeVisible()
  })

  test('should switch between version views', async ({ page }) => {
    // Create two views
    const view1 = createTestVersionViewData()
    const view2 = createTestVersionViewData()
    
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Create first view
    await page.click('button[aria-label="Create view"]')
    await page.fill('input[name="name"]', view1.name)
    await page.click('button:has-text("Create")')
    
    // Create second view
    await page.click('button[aria-label="Create view"]')
    await page.fill('input[name="name"]', view2.name)
    await page.click('button:has-text("Create")')
    
    // Switch to first view
    await page.click(`text=${view1.name}`)
    
    // Verify active view
    await expect(page.locator(`[aria-selected="true"]:has-text("${view1.name}")`)).toBeVisible()
    
    // Switch to second view
    await page.click(`text=${view2.name}`)
    
    // Verify active view changed
    await expect(page.locator(`[aria-selected="true"]:has-text("${view2.name}")`)).toBeVisible()
  })

  test('should update version view', async ({ page }) => {
    const viewData = createTestVersionViewData()
    const updatedName = `Updated ${viewData.name}`
    
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Create a view
    await page.click('button[aria-label="Create view"]')
    await page.fill('input[name="name"]', viewData.name)
    await page.click('button:has-text("Create")')
    
    // Open view menu and edit
    await page.locator('.MuiTab-root', { hasText: viewData.name }).locator('button[aria-label="more"]').click()
    await page.click('text=Edit')
    
    // Update name
    await page.fill('input[name="name"]', updatedName)
    await page.click('button:has-text("Save")')
    
    // Verify update
    await expect(page.locator(`text=${updatedName}`)).toBeVisible()
  })

  test('should delete version view', async ({ page }) => {
    const viewData = createTestVersionViewData()
    
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Create a view
    await page.click('button[aria-label="Create view"]')
    await page.fill('input[name="name"]', viewData.name)
    await page.click('button:has-text("Create")')
    
    // Open view menu and delete
    await page.locator('.MuiTab-root', { hasText: viewData.name }).locator('button[aria-label="more"]').click()
    await page.click('text=Delete')
    
    // Confirm
    await page.click('button:has-text("Delete")')
    
    // Verify deletion
    await expect(page.locator(`text=${viewData.name}`)).not.toBeVisible()
  })

  test('should show default view when no views exist', async ({ page }) => {
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Check for default view or empty state
    const defaultView = page.locator('text=Default View')
    const emptyState = page.locator('text=No views yet')
    
    const hasDefaultView = await defaultView.isVisible().catch(() => false)
    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    
    expect(hasDefaultView || hasEmptyState).toBeTruthy()
  })
})
