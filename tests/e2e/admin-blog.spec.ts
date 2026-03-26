import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { globalCleanup } from '../utils/cleanup'
import { generateTestId } from '../utils/test-data'
import { signInUser } from '../utils/auth-helper'

test.describe('Admin Blog E2E', () => {
  test.describe.configure({ mode: 'serial' })

  const service = createServiceClient()
  let adminEmail = ''
  const adminPassword = 'testpassword123'
  let adminUserId = ''
  const createdPostIds: string[] = []

  test.beforeAll(async () => {
    const id = generateTestId()
    adminEmail = `admin_blog_${id}@example.com`
    const { data: u, error: uErr } = await service.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { display_name: `AdminBlog_${id}` },
    })
    if (uErr) throw uErr
    adminUserId = u.user?.id ?? ''
    if (!adminUserId) throw new Error('admin user create failed')
    globalCleanup.trackUser(adminUserId)

    // Ensure the user is an admin.
    const { error: roleErr } = await service.from('profiles').update({ role: 'admin' }).eq('id', adminUserId)
    if (roleErr) throw roleErr
  })

  test.afterAll(async () => {
    for (const id of createdPostIds) {
      await service.from('blog_posts').delete().eq('id', id)
    }
    await globalCleanup.cleanupAll()
  })

  test.beforeEach(async ({ page }) => {
    await signInUser(page, adminEmail, adminPassword)
  })

  test('Admin can navigate to blog management', async ({ page }) => {
    await page.goto(`/admin/blog`)
    await page.waitForURL(/\/admin\/blog$/)
    
    // Check page loaded
    await expect(page.locator('h5:has-text("博客管理")')).toBeVisible()
  })

  test('Admin can create a new blog post', async ({ page }) => {
    await page.goto(`/admin/blog`)
    
    // Click create button
    await page.click('text=新建文章')
    await page.waitForURL('**/admin/blog/new**')
    
    // Fill form
    const ts = Date.now()
    const testSlug = `test-post-${ts}`
    const testTitle = `Test Post ${ts}`

    await page.getByRole('textbox', { name: '文章标题' }).fill(testTitle)
    // Title change auto-generates slug; override to stable value.
    await page.getByRole('textbox', { name: 'URL 标识' }).fill(testSlug)
    await page.getByRole('textbox', { name: '副标题' }).fill('Test subtitle')
    await page.getByRole('textbox', { name: '摘要' }).fill('Test excerpt')
    
    // Fill markdown content
    await page
      .getByRole('textbox', { name: /Write your blog post in Markdown/i })
      .fill('# Test Content\n\nThis is a test blog post.')
    
    // Save as draft
    await page.getByRole('button', { name: /保存|Save/i }).click()
    
    // Wait for redirect
    await page.waitForURL(/\/admin\/blog$/)
    
    // Verify post created via DB (list UI may be paginated/filtered)
    const { data: created, error: createdErr } = await service
      .from('blog_posts')
      .select('id,slug,title')
      .eq('slug', testSlug)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    expect(createdErr).toBeNull()
    expect(created?.title).toBe(testTitle)
    if (created?.id) createdPostIds.push(created.id)
  })

  test('Markdown editor has tabs', async ({ page }) => {
    await page.goto(`/admin/blog/new`)
    
    // Check tabs exist
    await expect(page.locator('role=tab[name="Edit"]')).toBeVisible()
    await expect(page.locator('role=tab[name="Preview"]')).toBeVisible()
    await expect(page.locator('role=tab[name="Split"]')).toBeVisible()
    
    // Type some markdown
    await page
      .getByRole('textbox', { name: /Write your blog post in Markdown/i })
      .fill('# Heading\n\n**Bold text**')
    
    // Switch to preview
    await page.click('role=tab[name="Preview"]')
    
    // Check rendered content
    await expect(page.locator('h1:has-text("Heading")')).toBeVisible()
    await expect(page.locator('strong:has-text("Bold text")')).toBeVisible()
  })

  test('Public blog page shows posts', async ({ page }) => {
    await page.goto(`/blog`)
    
    // Check blog page loaded
    await expect(page.locator('h1:has-text("开发博客")')).toBeVisible()
    
    // Check category filters
    await expect(page.locator('button:has-text("全部")')).toBeVisible()
    await expect(page.locator('button:has-text("历程")')).toBeVisible()
  })

  test('Blog post detail page renders markdown', async ({ page }) => {
    const testSlug = `test-slug-${Date.now()}`
    const title = 'Test Markdown Rendering'
    const content = '# Hello\n\n```javascript\nconst x = 1;\n```\n\n$$E = mc^2$$'

    const { data: created, error: createErr } = await service
      .from('blog_posts')
      .insert({
        slug: testSlug,
        title,
        subtitle: null,
        excerpt: null,
        content,
        cover_image: null,
        category: 'tech',
        status: 'published',
        meta_title: title,
        meta_description: null,
        author_id: adminUserId,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    expect(createErr).toBeNull()
    if (created?.id) createdPostIds.push(created.id)
    
    // Visit public page
    await page.goto(`/blog/${testSlug}`)
    
    // Check content rendered
    await expect(page.locator('h1:has-text("Hello")')).toBeVisible()
    await expect(page.locator('pre code').first()).toBeVisible() // Code block
  })
})
