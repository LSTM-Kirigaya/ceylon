import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { createTestProjectData, createTestVersionViewData, createTestRequirementData, generateTestId } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

/**
 * Requirements API Tests - Idempotent
 */

test.describe('Requirements API', () => {
  const supabase = createServiceClient()
  let testUserId: string | null = null
  let testProjectId: string | null = null
  let testViewId: string | null = null

  test.beforeAll(async () => {
    // Create test user
    const testId = generateTestId()
    const { data: user } = await supabase.auth.admin.createUser({
      email: `req_api_test_${testId}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    
    testUserId = user.user?.id || null
    if (testUserId) {
      globalCleanup.trackUser(testUserId)
    }
    
    // Create test project
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: `Test Project ${testId}`,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    testProjectId = project?.id || null
    if (testProjectId) {
      globalCleanup.trackProject(testProjectId)
    }
    
    // Create test view
    const { data: view } = await supabase
      .from('version_views')
      .insert({
        project_id: testProjectId,
        name: 'Test View',
      })
      .select()
      .single()
    
    testViewId = view?.id || null
    if (testViewId) {
      globalCleanup.trackView(testViewId)
    }
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('should create a requirement via API', async () => {
    const reqData = createTestRequirementData()
    
    // Get next requirement number
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { data: req, error } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum || 0,
        title: reqData.title,
        description: reqData.description,
        priority: reqData.priority,
        type: reqData.type,
        status: 'pending',
        created_by: testUserId,
      })
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(req).not.toBeNull()
    expect(req?.title).toBe(reqData.title)
    expect(req?.type).toBe(reqData.type)
    
    if (req) {
      globalCleanup.trackRequirement(req.id)
    }
  })

  test('should retrieve requirements for view', async () => {
    // Create a requirement
    const reqData = createTestRequirementData()
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { data: req } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
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
    
    // Query requirements
    const { data: requirements, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('version_view_id', testViewId)
    
    expect(error).toBeNull()
    expect(requirements).not.toBeNull()
    expect(requirements?.length).toBeGreaterThan(0)
  })

  test('should update requirement via API', async () => {
    // Create a requirement
    const reqData = createTestRequirementData()
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { data: req } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
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
      
      // Update requirement
      const updatedTitle = `Updated ${reqData.title}`
      const { data: updated, error } = await supabase
        .from('requirements')
        .update({ 
          title: updatedTitle,
          status: 'in_progress',
        })
        .eq('id', req.id)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(updated?.title).toBe(updatedTitle)
      expect(updated?.status).toBe('in_progress')
    }
  })

  test('should delete requirement via API', async () => {
    // Create a requirement
    const reqData = createTestRequirementData()
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { data: req } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum || 0,
        title: reqData.title,
        type: reqData.type,
        status: 'pending',
        created_by: testUserId,
      })
      .select()
      .single()
    
    if (req) {
      // Delete requirement
      const { error } = await supabase
        .from('requirements')
        .delete()
        .eq('id', req.id)
      
      expect(error).toBeNull()
      
      // Verify deletion
      const { data: deleted } = await supabase
        .from('requirements')
        .select('*')
        .eq('id', req.id)
        .single()
      
      expect(deleted).toBeNull()
    }
  })

  test('should get next requirement number', async () => {
    // Create first requirement
    const { data: nextNum1 } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    expect(nextNum1).toBeGreaterThanOrEqual(0)
    
    // Insert requirement
    await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum1 || 0,
        title: 'Test Req',
        type: 'Feature',
        status: 'pending',
        created_by: testUserId,
      })
    
    // Get next number
    const { data: nextNum2 } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    expect(nextNum2).toBe((nextNum1 || 0) + 1)
  })

  test('should enforce valid requirement types', async () => {
    const reqData = createTestRequirementData()
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { error } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum || 0,
        title: reqData.title,
        type: 'InvalidType',
        status: 'pending',
        created_by: testUserId,
      })
    
    expect(error).not.toBeNull()
  })

  test('should enforce valid requirement status', async () => {
    const reqData = createTestRequirementData()
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { error } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum || 0,
        title: reqData.title,
        type: 'Feature',
        status: 'invalid_status',
        created_by: testUserId,
      })
    
    expect(error).not.toBeNull()
  })

  test('should validate priority range', async () => {
    const reqData = createTestRequirementData({ priority: 15 })
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { error } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum || 0,
        title: reqData.title,
        type: reqData.type,
        priority: reqData.priority,
        status: 'pending',
        created_by: testUserId,
      })
    
    expect(error).not.toBeNull()
  })

  test('should cascade delete requirements when view is deleted', async () => {
    // Create a new view
    const { data: view } = await supabase
      .from('version_views')
      .insert({
        project_id: testProjectId,
        name: `Cascade View ${generateTestId()}`,
      })
      .select()
      .single()
    
    if (view) {
      // Create a requirement in this view
      const { data: req } = await supabase
        .from('requirements')
        .insert({
          version_view_id: view.id,
          requirement_number: 0,
          title: 'Cascade Test',
          type: 'Feature',
          status: 'pending',
          created_by: testUserId,
        })
        .select()
        .single()
      
      const reqId = req?.id
      
      // Delete view
      await supabase.from('version_views').delete().eq('id', view.id)
      
      // Verify requirement was also deleted
      const { data: deletedReq } = await supabase
        .from('requirements')
        .select('*')
        .eq('id', reqId)
        .single()
      
      expect(deletedReq).toBeNull()
    }
  })

  test('should filter requirements by status', async () => {
    // Create requirements with different statuses
    const { data: nextNum1 } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { data: req1 } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum1 || 0,
        title: 'Pending Req',
        type: 'Feature',
        status: 'pending',
        created_by: testUserId,
      })
      .select()
      .single()
    
    if (req1) {
      globalCleanup.trackRequirement(req1.id)
    }
    
    const { data: nextNum2 } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { data: req2 } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum2 || 0,
        title: 'Completed Req',
        type: 'Bug',
        status: 'completed',
        created_by: testUserId,
      })
      .select()
      .single()
    
    if (req2) {
      globalCleanup.trackRequirement(req2.id)
    }
    
    // Filter by status
    const { data: pendingReqs } = await supabase
      .from('requirements')
      .select('*')
      .eq('version_view_id', testViewId)
      .eq('status', 'pending')
    
    expect(pendingReqs?.length).toBeGreaterThan(0)
    expect(pendingReqs?.every(r => r.status === 'pending')).toBeTruthy()
  })

  test('should validate required title', async () => {
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { error } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum || 0,
        title: '',
        type: 'Feature',
        status: 'pending',
        created_by: testUserId,
      })
    
    expect(error).not.toBeNull()
  })
})
