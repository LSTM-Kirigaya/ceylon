import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { createTestProjectData, createTestVersionViewData, createTestRequirementData, generateTestId } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

/**
 * CLI API Tests - Idempotent
 * Tests the CLI endpoints used by the command-line tool
 */

test.describe('CLI API', () => {
  const supabase = createServiceClient()
  let testUserId: string | null = null
  let testUserEmail: string | null = null
  let authToken: string | null = null
  let projectId: string | null = null
  let viewId: string | null = null

  test.beforeAll(async () => {
    // Create test user
    const testId = generateTestId()
    testUserEmail = `cli_test_${testId}@example.com`
    
    const { data: user } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: 'testpassword123',
      email_confirm: true,
    })
    
    testUserId = user.user?.id || null
    if (testUserId) {
      globalCleanup.trackUser(testUserId)
    }
    
    // Get auth token
    const { data: auth } = await supabase.auth.signInWithPassword({
      email: testUserEmail,
      password: 'testpassword123',
    })
    
    authToken = auth.session?.access_token || null
    
    // Create test project
    const projectData = createTestProjectData()
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    projectId = project?.id || null
    if (projectId) {
      globalCleanup.trackProject(projectId)
    }
    
    // Create test view
    const viewData = createTestVersionViewData()
    const { data: view } = await supabase
      .from('version_views')
      .insert({
        project_id: projectId,
        name: viewData.name,
      })
      .select()
      .single()
    
    viewId = view?.id || null
    if (viewId) {
      globalCleanup.trackView(viewId)
    }
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('should get projects list via CLI API', async ({ request }) => {
    const response = await request.post('/api/cli/projects', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })
    
    expect(response.status()).toBe(200)
    
    const body = await response.json()
    expect(body.projects).toBeDefined()
    expect(Array.isArray(body.projects)).toBeTruthy()
    expect(body.projects.length).toBeGreaterThan(0)
  })

  test('should get version views via CLI API', async ({ request }) => {
    const response = await request.post('/api/cli/views', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      data: {
        projectId: projectId,
      },
    })
    
    expect(response.status()).toBe(200)
    
    const body = await response.json()
    expect(body.views).toBeDefined()
    expect(Array.isArray(body.views)).toBeTruthy()
  })

  test('should get requirements via CLI API', async ({ request }) => {
    // Create a requirement first
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: viewId })
    
    const reqData = createTestRequirementData()
    const { data: req } = await supabase
      .from('requirements')
      .insert({
        version_view_id: viewId,
        requirement_number: nextNum || 0,
        title: reqData.title,
        type: reqData.type,
        status: 'pending',
        created_by: testUserId,
      })
      .select()
      .single()
    
    if (req) {
      globalCleanup.trackRequirement(req.id)
    }
    
    // Query via CLI API
    const response = await request.post('/api/cli/requirements', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      data: {
        viewId: viewId,
      },
    })
    
    expect(response.status()).toBe(200)
    
    const body = await response.json()
    expect(body.requirements).toBeDefined()
    expect(Array.isArray(body.requirements)).toBeTruthy()
    expect(body.requirements.length).toBeGreaterThan(0)
  })

  test('should create requirement via CLI API', async ({ request }) => {
    const reqData = createTestRequirementData()
    
    const response = await request.post('/api/cli/requirements/create', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      data: {
        viewId: viewId,
        title: reqData.title,
        description: reqData.description,
        priority: reqData.priority,
        type: reqData.type,
      },
    })
    
    expect(response.status()).toBe(200)
    
    const body = await response.json()
    expect(body.requirement).toBeDefined()
    expect(body.requirement.title).toBe(reqData.title)
    expect(body.requirement.type).toBe(reqData.type)
    
    if (body.requirement?.id) {
      globalCleanup.trackRequirement(body.requirement.id)
    }
  })

  test('should update requirement via CLI API', async ({ request }) => {
    // Create a requirement
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: viewId })
    
    const reqData = createTestRequirementData()
    const { data: req } = await supabase
      .from('requirements')
      .insert({
        version_view_id: viewId,
        requirement_number: nextNum || 0,
        title: reqData.title,
        type: reqData.type,
        status: 'pending',
        created_by: testUserId,
      })
      .select()
      .single()
    
    if (req) {
      globalCleanup.trackRequirement(req.id)
      
      // Update via CLI API
      const updatedTitle = `Updated ${reqData.title}`
      const response = await request.post('/api/cli/requirements/update', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          reqId: req.id,
          updates: {
            title: updatedTitle,
            status: 'in_progress',
          },
        },
      })
      
      expect(response.status()).toBe(200)
      
      const body = await response.json()
      expect(body.success).toBe(true)
      
      // Verify update
      const { data: updated } = await supabase
        .from('requirements')
        .select('*')
        .eq('id', req.id)
        .single()
      
      expect(updated?.title).toBe(updatedTitle)
      expect(updated?.status).toBe('in_progress')
    }
  })

  test('should delete requirement via CLI API', async ({ request }) => {
    // Create a requirement
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: viewId })
    
    const reqData = createTestRequirementData()
    const { data: req } = await supabase
      .from('requirements')
      .insert({
        version_view_id: viewId,
        requirement_number: nextNum || 0,
        title: reqData.title,
        type: reqData.type,
        status: 'pending',
        created_by: testUserId,
      })
      .select()
      .single()
    
    if (req) {
      // Delete via CLI API
      const response = await request.post('/api/cli/requirements/delete', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          reqId: req.id,
        },
      })
      
      expect(response.status()).toBe(200)
      
      const body = await response.json()
      expect(body.success).toBe(true)
      
      // Verify deletion
      const { data: deleted } = await supabase
        .from('requirements')
        .select('*')
        .eq('id', req.id)
        .single()
      
      expect(deleted).toBeNull()
    }
  })

  test('should reject unauthorized requests', async ({ request }) => {
    const response = await request.post('/api/cli/projects', {
      headers: {
        'Authorization': 'Bearer invalid_token',
      },
    })
    
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('should reject missing authorization', async ({ request }) => {
    const response = await request.post('/api/cli/projects')
    
    expect(response.status()).toBe(401)
  })

  test('should return 404 for unknown endpoint', async ({ request }) => {
    const response = await request.post('/api/cli/unknown', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })
    
    expect(response.status()).toBe(404)
  })

  test('should validate required fields for requirement creation', async ({ request }) => {
    const response = await request.post('/api/cli/requirements/create', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      data: {
        viewId: viewId,
        // Missing title
      },
    })
    
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body.error).toContain('required')
  })
})
