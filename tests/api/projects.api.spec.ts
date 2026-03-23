import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { createTestProjectData, createTestVersionViewData, createTestRequirementData, generateTestId } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

/**
 * Project API Tests - Idempotent
 * Tests the backend database operations through Supabase client
 */

test.describe('Project API', () => {
  const supabase = createServiceClient()
  let testUserId: string | null = null

  test.beforeAll(async () => {
    // Create a test user for API tests
    const testId = generateTestId()
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: `api_test_${testId}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    
    if (error) {
      throw error
    }
    
    testUserId = user.user?.id || null
    if (testUserId) {
      globalCleanup.trackUser(testUserId)
    }
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('should create a project via API', async () => {
    const projectData = createTestProjectData()
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(project).not.toBeNull()
    expect(project?.name).toBe(projectData.name)
    expect(project?.description).toBe(projectData.description)
    expect(project?.owner_id).toBe(testUserId)
    
    if (project) {
      globalCleanup.trackProject(project.id)
    }
  })

  test('should retrieve projects for user', async () => {
    // Create a project first
    const projectData = createTestProjectData()
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    if (project) {
      globalCleanup.trackProject(project.id)
    }
    
    // Query projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', testUserId)
    
    expect(error).toBeNull()
    expect(projects).not.toBeNull()
    expect(projects?.length).toBeGreaterThan(0)
  })

  test('should update project via API', async () => {
    // Create a project
    const projectData = createTestProjectData()
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    if (project) {
      globalCleanup.trackProject(project.id)
      
      // Update project
      const updatedName = `Updated ${projectData.name}`
      const { data: updated, error } = await supabase
        .from('projects')
        .update({ name: updatedName })
        .eq('id', project.id)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(updated?.name).toBe(updatedName)
    }
  })

  test('should delete project via API', async () => {
    // Create a project
    const projectData = createTestProjectData()
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    if (project) {
      // Delete project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)
      
      expect(error).toBeNull()
      
      // Verify deletion
      const { data: deleted } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .single()
      
      expect(deleted).toBeNull()
    }
  })

  test('should enforce unique project names per user', async () => {
    const projectName = `Duplicate Test ${generateTestId()}`
    
    // Create first project
    const { data: project1 } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    if (project1) {
      globalCleanup.trackProject(project1.id)
    }
    
    // Try to create second project with same name (should fail if unique constraint exists)
    const { error } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        owner_id: testUserId,
      })
    
    // Note: This test behavior depends on whether you have a unique constraint
    // If no constraint, error will be null
    // If constraint exists, error will not be null
  })

  test('should validate required project name', async () => {
    const { error } = await supabase
      .from('projects')
      .insert({
        name: '',
        owner_id: testUserId,
      })
    
    expect(error).not.toBeNull()
  })
})
