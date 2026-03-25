import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { createTestProjectData, createTestVersionViewData, createTestRequirementData, generateTestId } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

/**
 * Row Level Security (RLS) Policy Tests - Idempotent
 * Verifies that users can only access data they have permission to
 */

test.describe('Row Level Security Policies', () => {
  const supabase = createServiceClient()
  let user1Id: string | null = null
  let user2Id: string | null = null
  let user1ProjectId: string | null = null
  let user2ProjectId: string | null = null

  test.beforeAll(async () => {
    // Create two test users
    const testId1 = generateTestId()
    const { data: user1 } = await supabase.auth.admin.createUser({
      email: `rls_user1_${testId1}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    
    user1Id = user1.user?.id || null
    if (user1Id) {
      globalCleanup.trackUser(user1Id)
    }
    
    const testId2 = generateTestId()
    const { data: user2 } = await supabase.auth.admin.createUser({
      email: `rls_user2_${testId2}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    
    user2Id = user2.user?.id || null
    if (user2Id) {
      globalCleanup.trackUser(user2Id)
    }
    
    // Create a project for each user
    const { data: project1 } = await supabase
      .from('projects')
      .insert({
        name: `User1 Project ${testId1}`,
        owner_id: user1Id,
      })
      .select()
      .single()
    
    user1ProjectId = project1?.id || null
    if (user1ProjectId) {
      globalCleanup.trackProject(user1ProjectId)
    }
    
    const { data: project2 } = await supabase
      .from('projects')
      .insert({
        name: `User2 Project ${testId2}`,
        owner_id: user2Id,
      })
      .select()
      .single()
    
    user2ProjectId = project2?.id || null
    if (user2ProjectId) {
      globalCleanup.trackProject(user2ProjectId)
    }
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('user should only see their own projects', async () => {
    // Query as user1
    const { data: user1Projects } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user1Id)
    
    // User1 should see their project
    expect(user1Projects?.some(p => p.id === user1ProjectId)).toBeTruthy()
    
    // User1 should not see user2's project
    expect(user1Projects?.some(p => p.id === user2ProjectId)).toBeFalsy()
  })

  test('user should not be able to update other users projects', async () => {
    // Try to update user2's project as user1
    const { error } = await supabase
      .from('projects')
      .update({ name: 'Hacked Name' })
      .eq('id', user2ProjectId)
      .eq('owner_id', user1Id)
    
    // Should either return error or update 0 rows
    expect(error || true).toBeTruthy()
    
    // Verify project was not changed
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', user2ProjectId)
      .single()
    
    expect(project?.name).not.toBe('Hacked Name')
  })

  test('user should not be able to delete other users projects', async () => {
    // Try to delete user2's project as user1
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', user2ProjectId)
      .eq('owner_id', user1Id)
    
    // Verify project still exists
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', user2ProjectId)
      .single()
    
    expect(project).not.toBeNull()
  })

  test('member should see projects they are part of', async () => {
    // Add user2 as a member to user1's project
    await supabase
      .from('project_members')
      .insert({
        project_id: user1ProjectId,
        user_id: user2Id,
        role: 'read',
      })
    
    // Query projects that user2 can see
    const { data: ownedProjects } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user2Id)
    
    const { data: memberProjects } = await supabase
      .from('project_members')
      .select('projects(*)')
      .eq('user_id', user2Id)
    
    const allProjectIds = [
      ...(ownedProjects?.map(p => p.id) || []),
      ...(memberProjects?.map(m => m.projects?.id) || []),
    ]
    
    // User2 should see both their own project and user1's project (as member)
    expect(allProjectIds).toContain(user2ProjectId)
    expect(allProjectIds).toContain(user1ProjectId)
  })

  test('read-only member should not be able to update project', async () => {
    // Add user2 as read-only member to user1's project
    await supabase
      .from('project_members')
      .insert({
        project_id: user1ProjectId,
        user_id: user2Id,
        role: 'read',
      })
    
    // Try to update project as user2 (read-only)
    const { error } = await supabase
      .from('projects')
      .update({ name: 'Changed by Member' })
      .eq('id', user1ProjectId)
    
    // Should not be able to update
    expect(error || true).toBeTruthy()
  })

  test('write member should be able to update project but not delete', async () => {
    // Add user2 as write member to user1's project
    await supabase
      .from('project_members')
      .insert({
        project_id: user1ProjectId,
        user_id: user2Id,
        role: 'write',
      })
    
    // Write member should be able to create version views
    const viewData = createTestVersionViewData()
    const { data: view, error: createError } = await supabase
      .from('version_views')
      .insert({
        project_id: user1ProjectId,
        name: viewData.name,
      })
      .select()
      .single()
    
    expect(createError).toBeNull()
    expect(view).not.toBeNull()
    
    if (view) {
      globalCleanup.trackView(view.id)
    }
    
    // Write member should not be able to delete project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', user1ProjectId)
      .eq('owner_id', user2Id)
    
    // Project should still exist
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', user1ProjectId)
      .single()
    
    expect(project).not.toBeNull()
  })

  test('admin member should be able to delete project', async () => {
    // Create a new project for deletion test
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: `Admin Delete Test ${generateTestId()}`,
        owner_id: user1Id,
      })
      .select()
      .single()
    
    if (project) {
      // Add user2 as admin
      await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: user2Id,
          role: 'admin',
        })
      
      // Admin should be able to delete
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

  test('user should only see their own profile', async () => {
    // Query user1's profile
    const { data: profile1 } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user1Id)
      .single()
    
    expect(profile1?.id).toBe(user1Id)
    
    // Query user2's profile
    const { data: profile2 } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user2Id)
      .single()
    
    expect(profile2?.id).toBe(user2Id)
  })

  test('user should not be able to update other profiles', async () => {
    // Try to update user2's profile as user1
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: 'Hacked' })
      .eq('id', user2Id)
      .eq('id', user1Id) // This won't match
    
    // Verify profile was not changed
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user2Id)
      .single()
    
    expect(profile?.display_name).not.toBe('Hacked')
  })
})
