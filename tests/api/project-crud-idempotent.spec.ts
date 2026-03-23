import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { generateTestId } from '../utils/test-data'

/**
 * Project CRUD Tests - Idempotent
 * Tests Create, Read, Update, Delete operations for projects
 * Each successful creation is followed by deletion to ensure idempotency
 */

test.describe('Project CRUD Operations (Idempotent)', () => {
  const supabase = createServiceClient()
  let testUserId: string | null = null
  let testUserEmail: string

  test.beforeAll(async () => {
    // Create a test user for API tests
    const testId = generateTestId()
    testUserEmail = `crud_test_${testId}@example.com`
    
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: 'testpassword123',
      email_confirm: true,
    })
    
    if (error) {
      console.error('Failed to create test user:', error)
      throw error
    }
    
    testUserId = user.user?.id || null
    console.log(`Created test user: ${testUserEmail} with ID: ${testUserId}`)
  })

  test.afterAll(async () => {
    // Cleanup: Delete test user (this will cascade delete all related data)
    if (testUserId) {
      const { error } = await supabase.auth.admin.deleteUser(testUserId)
      if (error) {
        console.error('Failed to cleanup test user:', error)
      } else {
        console.log(`Cleaned up test user: ${testUserEmail}`)
      }
    }
  })

  test('CREATE: should create a new project with icon_url support', async () => {
    const projectName = `Create Test ${generateTestId()}`
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        description: 'Test project for CREATE operation',
        owner_id: testUserId,
        icon_url: 'https://example.com/test-icon.png',
      })
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(project).not.toBeNull()
    expect(project?.name).toBe(projectName)
    expect(project?.description).toBe('Test project for CREATE operation')
    expect(project?.owner_id).toBe(testUserId)
    expect(project?.icon_url).toBe('https://example.com/test-icon.png')
    
    // Idempotency: Delete immediately after creation
    if (project) {
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)
      
      expect(deleteError).toBeNull()
      console.log(`✓ Created and deleted project: ${projectName}`)
    }
  })

  test('READ: should retrieve project by ID', async () => {
    // Setup: Create a project
    const projectName = `Read Test ${generateTestId()}`
    const { data: created } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        description: 'Test project for READ operation',
        owner_id: testUserId,
      })
      .select()
      .single()
    
    expect(created).not.toBeNull()
    
    if (created) {
      // Test READ operation
      const { data: retrieved, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', created.id)
        .single()
      
      expect(error).toBeNull()
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.name).toBe(projectName)
      expect(retrieved?.owner_id).toBe(testUserId)
      
      // Idempotency: Delete after test
      await supabase.from('projects').delete().eq('id', created.id)
      console.log(`✓ Read test passed for: ${projectName}`)
    }
  })

  test('READ: should list all projects for a user', async () => {
    // Setup: Create multiple projects
    const projectNames = [
      `List Test 1 ${generateTestId()}`,
      `List Test 2 ${generateTestId()}`,
    ]
    
    const createdIds: string[] = []
    
    for (const name of projectNames) {
      const { data } = await supabase
        .from('projects')
        .insert({ name, owner_id: testUserId })
        .select()
        .single()
      
      if (data) {
        createdIds.push(data.id)
      }
    }
    
    // Test LIST operation
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', testUserId)
    
    expect(error).toBeNull()
    expect(projects).not.toBeNull()
    expect(projects?.length).toBeGreaterThanOrEqual(2)
    
    // Idempotency: Delete all created projects
    for (const id of createdIds) {
      await supabase.from('projects').delete().eq('id', id)
    }
    console.log(`✓ List test passed, cleaned up ${createdIds.length} projects`)
  })

  test('UPDATE: should update project name and description', async () => {
    // Setup: Create a project
    const originalName = `Update Test ${generateTestId()}`
    const { data: created } = await supabase
      .from('projects')
      .insert({
        name: originalName,
        description: 'Original description',
        owner_id: testUserId,
      })
      .select()
      .single()
    
    expect(created).not.toBeNull()
    
    if (created) {
      // Test UPDATE operation
      const updatedName = `Updated ${originalName}`
      const updatedDesc = 'Updated description'
      
      const { data: updated, error } = await supabase
        .from('projects')
        .update({
          name: updatedName,
          description: updatedDesc,
          updated_at: new Date().toISOString(),
        })
        .eq('id', created.id)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(updated?.name).toBe(updatedName)
      expect(updated?.description).toBe(updatedDesc)
      expect(updated?.id).toBe(created.id) // ID should remain same
      
      // Idempotency: Delete after test
      await supabase.from('projects').delete().eq('id', created.id)
      console.log(`✓ Update test passed for: ${originalName}`)
    }
  })

  test('UPDATE: should update project icon_url', async () => {
    // Setup: Create a project without icon
    const projectName = `Icon Update Test ${generateTestId()}`
    const { data: created } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        owner_id: testUserId,
        icon_url: null,
      })
      .select()
      .single()
    
    expect(created).not.toBeNull()
    
    if (created) {
      // Test UPDATE icon_url
      const iconUrl = 'https://example.com/updated-icon.png'
      
      const { data: updated, error } = await supabase
        .from('projects')
        .update({ icon_url: iconUrl })
        .eq('id', created.id)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(updated?.icon_url).toBe(iconUrl)
      
      // Idempotency: Delete after test
      await supabase.from('projects').delete().eq('id', created.id)
      console.log(`✓ Icon update test passed for: ${projectName}`)
    }
  })

  test('DELETE: should delete project by ID', async () => {
    // Setup: Create a project to delete
    const projectName = `Delete Test ${generateTestId()}`
    const { data: created } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    expect(created).not.toBeNull()
    
    if (created) {
      // Test DELETE operation
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', created.id)
      
      expect(deleteError).toBeNull()
      
      // Verify deletion
      const { data: deleted, error: verifyError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', created.id)
        .single()
      
      expect(verifyError).not.toBeNull() // Should error because row doesn't exist
      expect(deleted).toBeNull()
      console.log(`✓ Delete test passed for: ${projectName}`)
    }
  })

  test('FULL CRUD CYCLE: create, read, update, delete in sequence', async () => {
    const projectName = `Full Cycle ${generateTestId()}`
    
    // 1. CREATE
    const { data: created, error: createError } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        description: 'Initial description',
        owner_id: testUserId,
      })
      .select()
      .single()
    
    expect(createError).toBeNull()
    expect(created).not.toBeNull()
    console.log(`  → Created: ${created?.name}`)
    
    // 2. READ
    const { data: read, error: readError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', created!.id)
      .single()
    
    expect(readError).toBeNull()
    expect(read?.name).toBe(projectName)
    console.log(`  → Read: ${read?.name}`)
    
    // 3. UPDATE
    const updatedName = `Updated ${projectName}`
    const { data: updated, error: updateError } = await supabase
      .from('projects')
      .update({ name: updatedName })
      .eq('id', created!.id)
      .select()
      .single()
    
    expect(updateError).toBeNull()
    expect(updated?.name).toBe(updatedName)
    console.log(`  → Updated: ${updated?.name}`)
    
    // 4. DELETE (ensures idempotency)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', created!.id)
    
    expect(deleteError).toBeNull()
    console.log(`  → Deleted: ${updatedName}`)
    
    // Verify deletion
    const { data: verify } = await supabase
      .from('projects')
      .select('*')
      .eq('id', created!.id)
      .single()
    
    expect(verify).toBeNull()
    console.log(`✓ Full CRUD cycle completed successfully`)
  })

  test('EDGE CASE: should handle empty project name validation', async () => {
    const { error } = await supabase
      .from('projects')
      .insert({
        name: '',
        owner_id: testUserId,
      })
    
    expect(error).not.toBeNull()
    console.log(`✓ Empty name validation passed`)
  })

  test('EDGE CASE: should handle very long project name', async () => {
    const longName = 'A'.repeat(200)
    
    const { data: created, error } = await supabase
      .from('projects')
      .insert({
        name: longName,
        owner_id: testUserId,
      })
      .select()
      .single()
    
    if (created) {
      // If created successfully, delete it (idempotency)
      await supabase.from('projects').delete().eq('id', created.id)
      console.log(`✓ Long name test passed (name length: ${longName.length})`)
    } else {
      // If failed, that's also acceptable behavior
      console.log(`✓ Long name rejected (expected behavior)`)
    }
  })
})
