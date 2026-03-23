import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { generateTestId } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

/**
 * Database Function Tests - Idempotent
 * Tests PostgreSQL functions and triggers
 */

test.describe('Database Functions', () => {
  const supabase = createServiceClient()
  let testUserId: string | null = null
  let testProjectId: string | null = null
  let testViewId: string | null = null

  test.beforeAll(async () => {
    // Create test user
    const testId = generateTestId()
    const { data: user } = await supabase.auth.admin.createUser({
      email: `func_test_${testId}@example.com`,
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
        name: `Function Test Project ${testId}`,
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

  test('get_next_requirement_number should return 0 for empty view', async () => {
    // Create a new empty view
    const { data: view } = await supabase
      .from('version_views')
      .insert({
        project_id: testProjectId,
        name: `Empty View ${generateTestId()}`,
      })
      .select()
      .single()
    
    if (view) {
      globalCleanup.trackView(view.id)
      
      const { data: nextNum, error } = await supabase
        .rpc('get_next_requirement_number', { p_version_view_id: view.id })
      
      expect(error).toBeNull()
      expect(nextNum).toBe(0)
    }
  })

  test('get_next_requirement_number should increment correctly', async () => {
    // Create requirements and check increment
    const numbers: number[] = []
    
    for (let i = 0; i < 5; i++) {
      const { data: nextNum } = await supabase
        .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
      
      numbers.push(nextNum || 0)
      
      // Create requirement with this number
      await supabase
        .from('requirements')
        .insert({
          version_view_id: testViewId,
          requirement_number: nextNum || 0,
          title: `Test Req ${i}`,
          type: 'Feature',
          status: 'pending',
          created_by: testUserId,
        })
    }
    
    // Numbers should be sequential
    for (let i = 0; i < numbers.length; i++) {
      expect(numbers[i]).toBe(i)
    }
  })

  test('updated_at trigger should update timestamp on project update', async () => {
    // Get current timestamp
    const { data: before } = await supabase
      .from('projects')
      .select('updated_at')
      .eq('id', testProjectId)
      .single()
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Update project
    await supabase
      .from('projects')
      .update({ name: `Updated ${generateTestId()}` })
      .eq('id', testProjectId)
    
    // Get new timestamp
    const { data: after } = await supabase
      .from('projects')
      .select('updated_at')
      .eq('id', testProjectId)
      .single()
    
    // Timestamps should be different
    expect(new Date(after?.updated_at || '').getTime())
      .toBeGreaterThan(new Date(before?.updated_at || '').getTime())
  })

  test('updated_at trigger should update timestamp on requirement update', async () => {
    // Create a requirement
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    const { data: req } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum || 0,
        title: 'Trigger Test',
        type: 'Feature',
        status: 'pending',
        created_by: testUserId,
      })
      .select()
      .single()
    
    if (req) {
      globalCleanup.trackRequirement(req.id)
      
      // Get current timestamp
      const { data: before } = await supabase
        .from('requirements')
        .select('updated_at')
        .eq('id', req.id)
        .single()
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Update requirement
      await supabase
        .from('requirements')
        .update({ title: 'Updated Title' })
        .eq('id', req.id)
      
      // Get new timestamp
      const { data: after } = await supabase
        .from('requirements')
        .select('updated_at')
        .eq('id', req.id)
        .single()
      
      // Timestamps should be different
      expect(new Date(after?.updated_at || '').getTime())
        .toBeGreaterThan(new Date(before?.updated_at || '').getTime())
    }
  })

  test('handle_new_user trigger should create profile', async () => {
    // Create a new user
    const testId = generateTestId()
    const { data: user } = await supabase.auth.admin.createUser({
      email: `profile_trigger_${testId}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    
    const userId = user.user?.id
    if (userId) {
      globalCleanup.trackUser(userId)
      
      // Wait a bit for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Check if profile was created
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      expect(error).toBeNull()
      expect(profile).not.toBeNull()
      expect(profile?.email).toBe(`profile_trigger_${testId}@example.com`)
    }
  })

  test('requirement_number should be unique per view', async () => {
    const { data: nextNum } = await supabase
      .rpc('get_next_requirement_number', { p_version_view_id: testViewId })
    
    // Create first requirement
    const { data: req1 } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum || 0,
        title: 'First',
        type: 'Feature',
        status: 'pending',
        created_by: testUserId,
      })
      .select()
      .single()
    
    if (req1) {
      globalCleanup.trackRequirement(req1.id)
    }
    
    // Try to create second with same number
    const { error } = await supabase
      .from('requirements')
      .insert({
        version_view_id: testViewId,
        requirement_number: nextNum || 0,
        title: 'Second',
        type: 'Bug',
        status: 'pending',
        created_by: testUserId,
      })
    
    expect(error).not.toBeNull()
  })

  test('requirement_number can be same in different views', async () => {
    // Create a second view
    const { data: view2 } = await supabase
      .from('version_views')
      .insert({
        project_id: testProjectId,
        name: `View 2 ${generateTestId()}`,
      })
      .select()
      .single()
    
    if (view2) {
      globalCleanup.trackView(view2.id)
      
      // Create requirements with same number in different views
      const { data: req1 } = await supabase
        .from('requirements')
        .insert({
          version_view_id: testViewId,
          requirement_number: 100,
          title: 'View 1 Req',
          type: 'Feature',
          status: 'pending',
          created_by: testUserId,
        })
        .select()
        .single()
      
      if (req1) {
        globalCleanup.trackRequirement(req1.id)
      }
      
      const { data: req2, error } = await supabase
        .from('requirements')
        .insert({
          version_view_id: view2.id,
          requirement_number: 100,
          title: 'View 2 Req',
          type: 'Bug',
          status: 'pending',
          created_by: testUserId,
        })
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(req2).not.toBeNull()
      
      if (req2) {
        globalCleanup.trackRequirement(req2.id)
      }
    }
  })

  test('cascade delete should remove related records', async () => {
    // Create a project with views and requirements
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: `Cascade Test ${generateTestId()}`,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    if (project) {
      // Create view
      const { data: view } = await supabase
        .from('version_views')
        .insert({
          project_id: project.id,
          name: 'Cascade View',
        })
        .select()
        .single()
      
      if (view) {
        // Create requirement
        const { data: req } = await supabase
          .from('requirements')
          .insert({
            version_view_id: view.id,
            requirement_number: 0,
            title: 'Cascade Req',
            type: 'Feature',
            status: 'pending',
            created_by: testUserId,
          })
          .select()
          .single()
        
        const reqId = req?.id
        
        // Add member
        await supabase
          .from('project_members')
          .insert({
            project_id: project.id,
            user_id: testUserId,
            role: 'admin',
          })
        
        // Delete project
        await supabase.from('projects').delete().eq('id', project.id)
        
        // Verify all related records are deleted
        const { data: deletedView } = await supabase
          .from('version_views')
          .select('*')
          .eq('id', view.id)
          .single()
        
        const { data: deletedReq } = await supabase
          .from('requirements')
          .select('*')
          .eq('id', reqId)
          .single()
        
        const { data: deletedMember } = await supabase
          .from('project_members')
          .select('*')
          .eq('project_id', project.id)
          .single()
        
        expect(deletedView).toBeNull()
        expect(deletedReq).toBeNull()
        expect(deletedMember).toBeNull()
      }
    }
  })
})
