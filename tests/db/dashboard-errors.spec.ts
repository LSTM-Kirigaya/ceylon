import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { generateTestId } from '../utils/test-data'

/**
 * Dashboard Error Reproduction Tests
 * These tests reproduce the exact errors seen in browser console
 */

test.describe('Dashboard Console Errors', () => {
  const supabase = createServiceClient()
  let testUserId: string | null = null
  let testUserEmail: string

  test.beforeAll(async () => {
    const testId = generateTestId()
    testUserEmail = `dashboard_test_${testId}@example.com`
    
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: 'testpassword123',
      email_confirm: true,
    })
    
    if (error) throw error
    testUserId = user.user?.id || null
  })

  test.afterAll(async () => {
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  test('ERROR 1: should not have infinite recursion in projects query', async () => {
    // This is the exact query that fails in dashboard
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    const isRecursionError = error?.code === '42P17' || 
                            error?.message?.includes('infinite recursion')
    
    if (isRecursionError) {
      console.error('❌ CRITICAL: Infinite recursion in projects query')
      console.error('   Error:', error?.message)
      console.log('💡 FIX: Run supabase/migrations/000004_fix_rls_recursion.sql')
    }
    
    expect(isRecursionError).toBe(false)
  })

  test('ERROR 2: should not have infinite recursion in project_members query', async () => {
    // This is the exact query that fails in dashboard
    const { data, error } = await supabase
      .from('project_members')
      .select('project_id, projects(*)')
      .order('created_at', { ascending: false })
    
    const isRecursionError = error?.code === '42P17' || 
                            error?.message?.includes('infinite recursion')
    
    if (isRecursionError) {
      console.error('❌ CRITICAL: Infinite recursion in project_members query')
      console.error('   Error:', error?.message)
      console.log('💡 FIX: Run supabase/migrations/000004_fix_rls_recursion.sql')
    }
    
    expect(isRecursionError).toBe(false)
  })

  test('ERROR 3: should have icon_url column', async () => {
    const testId = generateTestId()
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: `Icon Test ${testId}`,
        owner_id: testUserId,
        icon_url: 'https://example.com/icon.png',
      })
      .select()
      .single()
    
    const isColumnMissing = error?.message?.includes('icon_url') &&
                           error?.message?.includes('Could not find')
    
    if (isColumnMissing) {
      console.error('❌ CRITICAL: icon_url column missing in projects table')
      console.log('💡 FIX: Run: ALTER TABLE projects ADD COLUMN icon_url TEXT;')
    }
    
    expect(isColumnMissing).toBe(false)
    
    // Cleanup
    if (data?.id) {
      await supabase.from('projects').delete().eq('id', data.id)
    }
  })

  test('ERROR 4: should have project-icons storage bucket', async () => {
    const { data, error } = await supabase.storage.getBucket('project-icons')
    
    if (error) {
      console.error('❌ CRITICAL: project-icons storage bucket missing')
      console.error('   Error:', error.message)
      console.log('💡 FIX: Create bucket in Supabase Dashboard > Storage')
    }
    
    expect(error).toBeNull()
    expect(data?.name).toBe('project-icons')
  })

  test('DASHBOARD HEALTH CHECK: all critical functions working', async () => {
    const errors: string[] = []
    
    // Test 1: Projects query
    const { error: err1 } = await supabase.from('projects').select('*').limit(1)
    if (err1?.code === '42P17') errors.push('Projects query: infinite recursion')
    
    // Test 2: Project members query
    const { error: err2 } = await supabase.from('project_members').select('*').limit(1)
    if (err2?.code === '42P17') errors.push('Project members query: infinite recursion')
    
    // Test 3: Version views query
    const { error: err3 } = await supabase.from('version_views').select('*').limit(1)
    if (err3?.code === '42P17') errors.push('Version views query: infinite recursion')
    
    // Test 4: Storage bucket
    const { error: err4 } = await supabase.storage.getBucket('project-icons')
    if (err4) errors.push('Storage: project-icons bucket missing')
    
    if (errors.length > 0) {
      console.error('❌ DASHBOARD HEALTH CHECK FAILED:')
      errors.forEach(e => console.error(`   - ${e}`))
    } else {
      console.log('✅ DASHBOARD HEALTH CHECK PASSED')
    }
    
    expect(errors).toHaveLength(0)
  })
})
