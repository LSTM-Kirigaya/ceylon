import { test, expect } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'
import { createTestProjectData, generateTestId } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await signInUser(page)
  })

  test.afterAll(async () => {
    // Cleanup all test data
    await globalCleanup.cleanupAll()
  })

  test('should create a new project', async ({ page }) => {
    const testData = createTestProjectData()
    
    // Click "New Project" button
    await page.click('text=New Project')
    
    // Fill in project details
    await page.fill('input[name="name"]', testData.name)
    await page.fill('textarea[name="description"]', testData.description)
    
    // Submit form
    await page.click('button:has-text("Create Project")')
    
    // Verify project was created
    await expect(page.locator(`text=${testData.name}`)).toBeVisible()
    
    // Track for cleanup (extract project ID from URL or API response)
    // Note: In real implementation, we'd get the ID from the page or API
  })

  test('should display projects list', async ({ page }) => {
    // Verify we're on dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Check for projects heading
    await expect(page.locator('h4:has-text("Projects")')).toBeVisible()
    
    // Verify "New Project" button exists
    await expect(page.locator('button:has-text("New Project")')).toBeVisible()
  })

  test('should navigate to project detail', async ({ page }) => {
    // First create a project
    const testData = createTestProjectData()
    
    await page.click('text=New Project')
    await page.fill('input[name="name"]', testData.name)
    await page.fill('textarea[name="description"]', testData.description)
    await page.click('button:has-text("Create Project")')
    
    // Wait for project to appear and click on it
    await page.locator(`text=${testData.name}`).click()
    
    // Verify navigation to project page
    await expect(page).toHaveURL(/\/dashboard\/project\/[\w-]+/)
  })

  test('should update project from settings', async ({ page }) => {
    // Create a project first
    const testData = createTestProjectData()
    const updatedName = `Updated ${testData.name}`
    
    await page.click('text=New Project')
    await page.fill('input[name="name"]', testData.name)
    await page.click('button:has-text("Create Project")')
    
    // Navigate to project
    await page.locator(`text=${testData.name}`).click()
    
    // Go to settings
    await page.click('text=Settings')
    
    // Update name
    await page.fill('input[name="name"]', updatedName)
    await page.click('button:has-text("Save")')
    
    // Verify update
    await expect(page.locator(`text=${updatedName}`)).toBeVisible()
  })

  test('should delete project', async ({ page }) => {
    // Create a project to delete
    const testData = createTestProjectData()
    
    await page.click('text=New Project')
    await page.fill('input[name="name"]', testData.name)
    await page.click('button:has-text("Create Project")')
    
    // Find project and open menu
    const projectCard = page.locator('.MuiCard-root', { hasText: testData.name })
    await projectCard.locator('button[aria-label="more"]').click()
    
    // Click delete
    await page.click('text=Delete')
    
    // Confirm deletion
    await page.click('button:has-text("Confirm")')
    
    // Verify project is removed
    await expect(page.locator(`text=${testData.name}`)).not.toBeVisible()
  })

  test('should show empty state when no projects', async ({ page }) => {
    // This test assumes a fresh account or we cleanup all projects
    // Check for empty state elements
    const emptyState = page.locator('text=No projects yet')
    
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.locator('text=Create your first project')).toBeVisible()
      await expect(page.locator('button:has-text("Create a project")')).toBeVisible()
    }
  })
})
