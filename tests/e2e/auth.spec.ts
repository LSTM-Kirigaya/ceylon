import { test, expect } from '@playwright/test'
import { createTestUser, getAuthToken } from '../utils/auth-helper'
import { generateTestId } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

test.describe('Authentication', () => {
  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Verify dashboard elements
    await expect(page.locator('h4:has-text("Projects")')).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
    
    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('should register new user', async ({ page }) => {
    const testId = generateTestId()
    const email = `test_${testId}@example.com`
    const password = 'testpassword123'
    const displayName = `Test User ${testId}`
    
    await page.goto('/register')
    
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="displayName"]', displayName)
    await page.click('button[type="submit"]')
    
    // Should show success or redirect
    await expect(
      page.locator('text=Check your email').or(page.locator('text=Registration successful'))
    ).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    // Logout
    await page.click('[data-testid="user-avatar"]')
    await page.click('text=退出登录')
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should be redirected to login
    await expect(page).toHaveURL('/login')
  })

  test('should persist login after page refresh', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    // Refresh page
    await page.reload()
    
    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h4:has-text("Projects")')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Should show validation error
    await expect(page.locator('text=Please enter a valid email')).toBeVisible()
  })

  test('should validate password length', async ({ page }) => {
    await page.goto('/register')
    
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', '123')
    await page.click('button[type="submit"]')
    
    // Should show validation error
    await expect(page.locator('text=Password must be at least')).toBeVisible()
  })
})
