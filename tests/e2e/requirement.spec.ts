import { test, expect } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'
import { createTestProjectData, createTestVersionViewData, createTestRequirementData } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

test.describe('Requirement Management', () => {
  let projectId: string | null = null
  let viewId: string | null = null

  test.beforeEach(async ({ page }) => {
    await signInUser(page)
    
    // Create a test project and view if not exists
    if (!projectId) {
      const projectData = createTestProjectData()
      await page.click('text=New Project')
      await page.fill('input[name="name"]', projectData.name)
      await page.click('button:has-text("Create Project")')
      
      await page.locator(`text=${projectData.name}`).click()
      await page.waitForURL(/\/projects\/[\w-]+/)
      
      const url = page.url()
      projectId = url.split('/').pop() || null
      
      if (projectId) {
        globalCleanup.trackProject(projectId)
      }
      
      // Create a default view
      const viewData = createTestVersionViewData()
      await page.click('button[aria-label="Create view"]')
      await page.fill('input[name="name"]', viewData.name)
      await page.click('button:has-text("Create")')
      
      // Get view ID from URL or DOM
      // This is a simplified version - in reality we'd parse the URL or API response
    }
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('should create a new requirement', async ({ page }) => {
    const reqData = createTestRequirementData()
    
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Click add requirement button
    await page.click('button:has-text("Add Requirement")')
    
    // Fill requirement details
    await page.fill('input[name="title"]', reqData.title)
    await page.fill('textarea[name="description"]', reqData.description)
    
    // Select type
    await page.click('input[name="type"]')
    await page.click(`text=${reqData.type}`)
    
    // Set priority
    await page.fill('input[name="priority"]', reqData.priority.toString())
    
    // Submit
    await page.click('button:has-text("Create")')
    
    // Verify requirement was created
    await expect(page.locator(`text=${reqData.title}`)).toBeVisible()
  })

  test('should display requirements in table', async ({ page }) => {
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Check for requirements table
    await expect(page.locator('table')).toBeVisible()
    
    // Check for table headers
    await expect(page.locator('th:has-text("ID")')).toBeVisible()
    await expect(page.locator('th:has-text("Title")')).toBeVisible()
    await expect(page.locator('th:has-text("Type")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")')).toBeVisible()
    await expect(page.locator('th:has-text("Priority")')).toBeVisible()
  })

  test('should filter requirements by type', async ({ page }) => {
    // Create requirements of different types
    const bugReq = createTestRequirementData({ type: 'Bug', title: 'Bug Test' })
    const featureReq = createTestRequirementData({ type: 'Feature', title: 'Feature Test' })
    
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Create bug requirement
    await page.click('button:has-text("Add Requirement")')
    await page.fill('input[name="title"]', bugReq.title)
    await page.click('input[name="type"]')
    await page.click('text=Bug')
    await page.click('button:has-text("Create")')
    
    // Create feature requirement
    await page.click('button:has-text("Add Requirement")')
    await page.fill('input[name="title"]', featureReq.title)
    await page.click('input[name="type"]')
    await page.click('text=Feature')
    await page.click('button:has-text("Create")')
    
    // Filter by Bug type
    await page.click('button:has-text("Filter")')
    await page.click('text=Bug')
    
    // Verify only bug is shown
    await expect(page.locator(`text=${bugReq.title}`)).toBeVisible()
    await expect(page.locator(`text=${featureReq.title}`)).not.toBeVisible()
  })

  test('should update requirement status', async ({ page }) => {
    const reqData = createTestRequirementData()
    
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Create a requirement
    await page.click('button:has-text("Add Requirement")')
    await page.fill('input[name="title"]', reqData.title)
    await page.click('button:has-text("Create")')
    
    // Find requirement row and change status
    const row = page.locator('tr', { hasText: reqData.title })
    await row.locator('select[name="status"]').selectOption('in_progress')
    
    // Verify status change
    await expect(row.locator('text=开发中')).toBeVisible()
  })

  test('should assign requirement to user', async ({ page }) => {
    const reqData = createTestRequirementData()
    
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Create a requirement
    await page.click('button:has-text("Add Requirement")')
    await page.fill('input[name="title"]', reqData.title)
    await page.click('button:has-text("Create")')
    
    // Find requirement and assign
    const row = page.locator('tr', { hasText: reqData.title })
    await row.locator('button[aria-label="Assign"]').click()
    
    // Select current user
    await page.click('text=Assign to me')
    
    // Verify assignment
    await expect(row.locator('img[alt="Assignee"]')).toBeVisible()
  })

  test('should delete requirement', async ({ page }) => {
    const reqData = createTestRequirementData()
    
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Create a requirement
    await page.click('button:has-text("Add Requirement")')
    await page.fill('input[name="title"]', reqData.title)
    await page.click('button:has-text("Create")')
    
    // Find and delete requirement
    const row = page.locator('tr', { hasText: reqData.title })
    await row.locator('button[aria-label="Delete"]').click()
    
    // Confirm deletion
    await page.click('button:has-text("Delete")')
    
    // Verify deletion
    await expect(page.locator(`text=${reqData.title}`)).not.toBeVisible()
  })

  test('should search requirements', async ({ page }) => {
    const req1 = createTestRequirementData({ title: 'Unique Search Term Alpha' })
    const req2 = createTestRequirementData({ title: 'Different Beta Title' })
    
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Create requirements
    await page.click('button:has-text("Add Requirement")')
    await page.fill('input[name="title"]', req1.title)
    await page.click('button:has-text("Create")')
    
    await page.click('button:has-text("Add Requirement")')
    await page.fill('input[name="title"]', req2.title)
    await page.click('button:has-text("Create")')
    
    // Search for first requirement
    await page.fill('input[placeholder="Search requirements"]', 'Alpha')
    
    // Verify filtering
    await expect(page.locator(`text=${req1.title}`)).toBeVisible()
    await expect(page.locator(`text=${req2.title}`)).not.toBeVisible()
  })

  test('should show requirement details', async ({ page }) => {
    const reqData = createTestRequirementData()
    
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Create a requirement
    await page.click('button:has-text("Add Requirement")')
    await page.fill('input[name="title"]', reqData.title)
    await page.fill('textarea[name="description"]', reqData.description)
    await page.click('button:has-text("Create")')
    
    // Click on requirement to view details
    await page.click(`text=${reqData.title}`)
    
    // Verify detail view
    await expect(page.locator('h6:has-text("Requirement Details")')).toBeVisible()
    await expect(page.locator(`text=${reqData.description}`)).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    if (projectId) {
      await page.goto(`/dashboard/project/${projectId}`)
    }
    
    // Try to create requirement without title
    await page.click('button:has-text("Add Requirement")')
    await page.click('button:has-text("Create")')
    
    // Verify validation error
    await expect(page.locator('text=Title is required')).toBeVisible()
  })
})
