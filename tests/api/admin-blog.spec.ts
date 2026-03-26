import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.com'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123'
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

test.describe('Admin Blog API', () => {
  let authToken: string

  test.beforeAll(async ({ request }) => {
    // Login as admin
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    expect(loginRes.ok()).toBeTruthy()
    const cookies = loginRes.headers()['set-cookie']
    if (cookies) {
      authToken = cookies.split(';')[0]
    }
  })

  test('POST /api/admin/blog - Create blog post', async ({ request }) => {
    const slug = `test-post-${Date.now()}`
    const res = await request.post(`${BASE_URL}/api/admin/blog`, {
      headers: { Cookie: authToken },
      data: {
        slug,
        title: 'Test Blog Post',
        subtitle: 'A test subtitle',
        content: '# Hello World\n\nThis is a test post.',
        excerpt: 'Test excerpt',
        category: 'tech',
        status: 'draft',
      },
    })

    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.post).toBeDefined()
    expect(body.post.slug).toBe(slug)
    expect(body.post.title).toBe('Test Blog Post')
  })

  test('GET /api/admin/blog - List all posts', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/blog`, {
      headers: { Cookie: authToken },
    })

    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body.posts)).toBe(true)
  })

  test('PUT /api/admin/blog/[slug] - Update blog post', async ({ request }) => {
    // First create a post
    const slug = `update-test-${Date.now()}`
    const createRes = await request.post(`${BASE_URL}/api/admin/blog`, {
      headers: { Cookie: authToken },
      data: {
        slug,
        title: 'Original Title',
        content: 'Original content',
        category: 'journey',
        status: 'draft',
      },
    })
    expect(createRes.ok()).toBeTruthy()

    // Update the post
    const updateRes = await request.put(`${BASE_URL}/api/admin/blog/${slug}`, {
      headers: { Cookie: authToken },
      data: {
        title: 'Updated Title',
        content: 'Updated content',
        category: 'journey',
        status: 'published',
      },
    })

    expect(updateRes.ok()).toBeTruthy()
    const body = await updateRes.json()
    expect(body.post.title).toBe('Updated Title')
    expect(body.post.status).toBe('published')
  })

  test('DELETE /api/admin/blog/[slug] - Delete blog post', async ({ request }) => {
    // Create a post first
    const slug = `delete-test-${Date.now()}`
    await request.post(`${BASE_URL}/api/admin/blog`, {
      headers: { Cookie: authToken },
      data: {
        slug,
        title: 'To Be Deleted',
        content: 'This will be deleted',
        category: 'case',
        status: 'draft',
      },
    })

    // Delete the post
    const deleteRes = await request.delete(`${BASE_URL}/api/admin/blog/${slug}`, {
      headers: { Cookie: authToken },
    })

    expect(deleteRes.ok()).toBeTruthy()

    // Verify it's deleted
    const getRes = await request.get(`${BASE_URL}/api/admin/blog/${slug}`, {
      headers: { Cookie: authToken },
    })
    expect(getRes.status()).toBe(404)
  })

  test('GET /api/blog - Public list only shows published posts', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/blog`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body.posts)).toBe(true)
    // All returned posts should be published
    for (const post of body.posts) {
      expect(post.status).toBe('published')
    }
  })

  test('GET /api/blog/[slug] - Public can view published post', async ({ request }) => {
    // Create a published post via admin
    const slug = `public-test-${Date.now()}`
    await request.post(`${BASE_URL}/api/admin/blog`, {
      headers: { Cookie: authToken },
      data: {
        slug,
        title: 'Public Test Post',
        content: 'Public content',
        category: 'release',
        status: 'published',
      },
    })

    // View as public
    const res = await request.get(`${BASE_URL}/api/blog/${slug}`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.post.title).toBe('Public Test Post')
  })

  test('Non-admin cannot access admin endpoints', async ({ request }) => {
    // Try without auth
    const res = await request.get(`${BASE_URL}/api/admin/blog`)
    expect(res.status()).toBe(401)
  })
})
