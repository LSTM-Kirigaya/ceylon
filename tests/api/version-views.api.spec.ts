import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { createTestProjectData, createTestVersionViewData, generateTestId } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

/**
 * Version View API Tests - Idempotent
 */

test.describe('Version View API', () => {
  const supabase = createServiceClient()
  let testUserId: string | null = null
  let testProjectId: string | null = null

  test.beforeAll(async () => {
    // Create test user
    const testId = generateTestId()
    const { data: user } = await supabase.auth.admin.createUser({
      email: `view_api_test_${testId}@example.com`,
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
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('should create a version view via API', async () => {
    const viewData = createTestVersionViewData()
    
    const { data: view, error } = await supabase
      .from('version_views')
      .insert({
        project_id: testProjectId,
        name: viewData.name,
        description: viewData.description,
      })
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(view).not.toBeNull()
    expect(view?.name).toBe(viewData.name)
    expect(view?.project_id).toBe(testProjectId)
    
    if (view) {
      globalCleanup.trackView(view.id)
    }
  })

  test('should retrieve version views for project', async () => {
    // Create a view
    const viewData = createTestVersionViewData()
    const { data: view } = await supabase
      .from('version_views')
      .insert({
        project_id: testProjectId,
        name: viewData.name,
      })
      .select()
      .single()
    
    if (view) {
      globalCleanup.trackView(view.id)
    }
    
    // Query views
    const { data: views, error } = await supabase
      .from('version_views')
      .select('*')
      .eq('project_id', testProjectId)
    
    expect(error).toBeNull()
    expect(views).not.toBeNull()
    expect(views?.length).toBeGreaterThan(0)
  })

  test('should update version view via API', async () => {
    // Create a view
    const viewData = createTestVersionViewData()
    const { data: view } = await supabase
      .from('version_views')
      .insert({
        project_id: testProjectId,
        name: viewData.name,
      })
      .select()
      .single()
    
    if (view) {
      globalCleanup.trackView(view.id)
      
      // Update view
      const updatedName = `Updated ${viewData.name}`
      const { data: updated, error } = await supabase
        .from('version_views')
        .update({ name: updatedName })
        .eq('id', view.id)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(updated?.name).toBe(updatedName)
    }
  })

  test('should delete version view via API', async () => {
    // Create a view
    const viewData = createTestVersionViewData()
    const { data: view } = await supabase
      .from('version_views')
      .insert({
        project_id: testProjectId,
        name: viewData.name,
      })
      .select()
      .single()
    
    if (view) {
      // Delete view
      const { error } = await supabase
        .from('version_views')
        .delete()
        .eq('id', view.id)
      
      expect(error).toBeNull()
      
      // Verify deletion
      const { data: deleted } = await supabase
        .from('version_views')
        .select('*')
        .eq('id', view.id)
        .single()
      
      expect(deleted).toBeNull()
    }
  })

  test('should cascade delete views when project is deleted', async () => {
    // Create a new project
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: `Cascade Test ${generateTestId()}`,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    if (project) {
      // Create a view for this project
      const { data: view } = await supabase
        .from('version_views')
        .insert({
          project_id: project.id,
          name: 'Cascade View',
        })
        .select()
        .single()
      
      const viewId = view?.id
      
      // Delete project
      await supabase.from('projects').delete().eq('id', project.id)
      
      // Verify view was also deleted
      const { data: deletedView } = await supabase
        .from('version_views')
        .select('*')
        .eq('id', viewId)
        .single()
      
      expect(deletedView).toBeNull()
    }
  })

  test('should validate required view name', async () => {
    const { error } = await supabase
      .from('version_views')
      .insert({
        project_id: testProjectId,
        name: '',
      })
    
    expect(error).not.toBeNull()
  })

  test('should validate project_id reference', async () => {
    const { error } = await supabase
      .from('version_views')
      .insert({
        project_id: '00000000-0000-0000-0000-000000000000',
        name: 'Invalid Project View',
      })
    
    expect(error).not.toBeNull()
  })
})
