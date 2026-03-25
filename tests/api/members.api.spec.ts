import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { createTestProjectData, generateTestId } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

/**
 * Project Members API Tests - Idempotent
 */

test.describe('Project Members API', () => {
  const supabase = createServiceClient()
  let ownerId: string | null = null
  let memberId: string | null = null
  let projectId: string | null = null

  test.beforeAll(async () => {
    // Create owner user
    const testId1 = generateTestId()
    const { data: owner } = await supabase.auth.admin.createUser({
      email: `owner_${testId1}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    
    ownerId = owner.user?.id || null
    if (ownerId) {
      globalCleanup.trackUser(ownerId)
    }
    
    // Create member user
    const testId2 = generateTestId()
    const { data: member } = await supabase.auth.admin.createUser({
      email: `member_${testId2}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    
    memberId = member.user?.id || null
    if (memberId) {
      globalCleanup.trackUser(memberId)
    }
    
    // Create test project
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: `Member Test Project ${testId1}`,
        owner_id: ownerId,
      })
      .select()
      .single()
    
    projectId = project?.id || null
    if (projectId) {
      globalCleanup.trackProject(projectId)
    }
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('should add member to project', async () => {
    const { data: membership, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: memberId,
        role: 'write',
      })
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(membership).not.toBeNull()
    expect(membership?.role).toBe('write')
    expect(membership?.user_id).toBe(memberId)
  })

  test('should retrieve project members', async () => {
    // Add a member first
    await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: memberId,
        role: 'write',
      })
    
    // Query members
    const { data: members, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
    
    expect(error).toBeNull()
    expect(members).not.toBeNull()
    expect(members?.length).toBeGreaterThan(0)
  })

  test('should update member role', async () => {
    // Add a member
    await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: memberId,
        role: 'write',
      })
    
    // Update role
    const { data: updated, error } = await supabase
      .from('project_members')
      .update({ role: 'admin' })
      .eq('project_id', projectId)
      .eq('user_id', memberId)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(updated?.role).toBe('admin')
  })

  test('should remove member from project', async () => {
    // Add a member
    await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: memberId,
        role: 'write',
      })
    
    // Remove member
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', memberId)
    
    expect(error).toBeNull()
    
    // Verify removal
    const { data: membership } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', memberId)
      .single()
    
    expect(membership).toBeNull()
  })

  test('should enforce valid role values', async () => {
    const { error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: memberId,
        role: 'invalid_role',
      })
    
    expect(error).not.toBeNull()
  })

  test('should prevent duplicate memberships', async () => {
    // Add a member
    await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: memberId,
        role: 'write',
      })
    
    // Try to add same member again
    const { error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: memberId,
        role: 'read',
      })
    
    expect(error).not.toBeNull()
  })

  test('should cascade delete members when project is deleted', async () => {
    // Create a new project
    const testId = generateTestId()
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: `Cascade Member Project ${testId}`,
        owner_id: ownerId,
      })
      .select()
      .single()
    
    if (project) {
      // Add a member
      await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: memberId,
          role: 'write',
        })
      
      // Delete project
      await supabase.from('projects').delete().eq('id', project.id)
      
      // Verify member was also deleted
      const { data: membership } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', project.id)
        .eq('user_id', memberId)
        .single()
      
      expect(membership).toBeNull()
    }
  })

  test('should allow different roles for same user in different projects', async () => {
    // Create two projects
    const { data: project1 } = await supabase
      .from('projects')
      .insert({
        name: `Project 1 ${generateTestId()}`,
        owner_id: ownerId,
      })
      .select()
      .single()
    
    const { data: project2 } = await supabase
      .from('projects')
      .insert({
        name: `Project 2 ${generateTestId()}`,
        owner_id: ownerId,
      })
      .select()
      .single()
    
    if (project1 && project2) {
      globalCleanup.trackProject(project1.id)
      globalCleanup.trackProject(project2.id)
      
      // Add member with different roles
      await supabase
        .from('project_members')
        .insert({
          project_id: project1.id,
          user_id: memberId,
          role: 'admin',
        })
      
      await supabase
        .from('project_members')
        .insert({
          project_id: project2.id,
          user_id: memberId,
          role: 'read',
        })
      
      // Verify different roles
      const { data: membership1 } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', project1.id)
        .eq('user_id', memberId)
        .single()
      
      const { data: membership2 } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', project2.id)
        .eq('user_id', memberId)
        .single()
      
      expect(membership1?.role).toBe('admin')
      expect(membership2?.role).toBe('read')
    }
  })
})
