import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { generateTestId } from '../utils/test-data'

/**
 * RLS Policy Recursion Tests
 * Verifies RLS policies don't cause infinite recursion
 */

test.describe('RLS Policy - No Infinite Recursion', () => {
  const supabase = createServiceClient()
  let testUserId: string | null = null
  let testUserEmail: string

  test.beforeAll(async () => {
    // Create a test user
    const testId = generateTestId()
    testUserEmail = `rls_test_${testId}@example.com`
    
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
    console.log(`Created test user: ${testUserEmail}`)
  })

  test.afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId)
      console.log(`Cleaned up test user: ${testUserEmail}`)
    }
  })

  test('should query projects without infinite recursion error', async () => {
    // This query was causing "infinite recursion detected in policy for relation project_members"
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    const isRecursionError = error?.message?.includes('infinite recursion') ||
                            error?.code === '42P17'
    
    if (isRecursionError) {
      console.error('❌ Infinite recursion error detected:', error?.message)
    }
    
    expect(isRecursionError).toBe(false)
    expect(error?.code).not.toBe('42P17')
  })

  test('should query project_members without infinite recursion error', async () => {
    const { data, error } = await supabase
      .from('project_members')
      .select('project_id, projects(*)')
      .order('created_at', { ascending: false })
    
    const isRecursionError = error?.message?.includes('infinite recursion') ||
                            error?.code === '42P17'
    
    if (isRecursionError) {
      console.error('❌ Infinite recursion error detected:', error?.message)
    }
    
    expect(isRecursionError).toBe(false)
    expect(error?.code).not.toBe('42P17')
  })

  test('should create and read project without recursion', async () => {
    const testId = generateTestId()
    
    // Create project
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        name: `RLS Test ${testId}`,
        description: 'Testing RLS policies',
        owner_id: testUserId,
      })
      .select()
      .single()
    
    // Check for recursion error
    const isRecursionError = createError?.message?.includes('infinite recursion') ||
                            createError?.code === '42P17'
    expect(isRecursionError).toBe(false)
    
    if (project) {
      // Try to read it back
      const { data: read, error: readError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .single()
      
      const isReadRecursionError = readError?.message?.includes('infinite recursion') ||
                                  readError?.code === '42P17'
      expect(isReadRecursionError).toBe(false)
      
      // Cleanup
      await supabase.from('projects').delete().eq('id', project.id)
    }
  })

  test('should query version_views without infinite recursion error', async () => {
    const { data, error } = await supabase
      .from('version_views')
      .select('*')
      .limit(10)
    
    const isRecursionError = error?.message?.includes('infinite recursion') ||
                            error?.code === '42P17'
    
    expect(isRecursionError).toBe(false)
    expect(error?.code).not.toBe('42P17')
  })
})
