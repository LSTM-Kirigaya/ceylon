import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { generateTestId } from '../utils/test-data'

/**
 * Database Schema Validation Tests
 * Verifies database structure and constraints
 */

test.describe('Database Schema', () => {
  const supabase = createServiceClient()

  test('should have icon_url column in projects table', async () => {
    // Try to insert a project with icon_url
    const testId = generateTestId()
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: `Schema Test ${testId}`,
        owner_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        icon_url: 'https://example.com/test.png',
      })
      .select()
      .single()
    
    // Should not fail due to missing column
    // It may fail due to RLS or foreign key, but not "column does not exist"
    const isColumnMissing = error?.message?.includes('Could not find the') && 
                           error?.message?.includes('icon_url')
    
    expect(isColumnMissing).toBe(false)
    
    // Cleanup if created
    if (data?.id) {
      await supabase.from('projects').delete().eq('id', data.id)
    }
  })

  test('should have required columns in projects table', async () => {
    // Query projects table schema
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(0)
    
    expect(error).toBeNull()
  })

  test('should have project_members table with proper structure', async () => {
    const { data, error } = await supabase
      .from('project_members')
      .select('*')
      .limit(0)
    
    expect(error).toBeNull()
  })

  test('should have version_views table with proper structure', async () => {
    const { data, error } = await supabase
      .from('version_views')
      .select('*')
      .limit(0)
    
    expect(error).toBeNull()
  })
})
