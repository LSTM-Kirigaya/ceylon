import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'

/**
 * Storage Bucket Tests
 * Verifies storage buckets exist and are accessible
 */

test.describe('Storage Buckets', () => {
  const supabase = createServiceClient()

  test('should have avatars bucket', async () => {
    const { data, error } = await supabase.storage.getBucket('avatars')
    
    if (error) {
      console.error('❌ Avatars bucket error:', error.message)
    }
    
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data?.name).toBe('avatars')
  })

  test('should have project-icons bucket', async () => {
    const { data, error } = await supabase.storage.getBucket('project-icons')
    
    if (error) {
      console.error('❌ Project-icons bucket error:', error.message)
      console.log('💡 Run POST /api/fix to create missing buckets')
    }
    
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data?.name).toBe('project-icons')
    expect(data?.public).toBe(true)
  })

  test('should have attachments bucket', async () => {
    const { data, error } = await supabase.storage.getBucket('attachments')
    
    if (error) {
      console.error('❌ Attachments bucket error:', error.message)
    }
    
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data?.name).toBe('attachments')
  })

  test('should list all buckets', async () => {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    expect(error).toBeNull()
    expect(buckets).not.toBeNull()
    expect(buckets?.length).toBeGreaterThanOrEqual(3)
    
    const bucketNames = buckets?.map(b => b.name) || []
    console.log('Available buckets:', bucketNames)
    
    expect(bucketNames).toContain('avatars')
    expect(bucketNames).toContain('project-icons')
    expect(bucketNames).toContain('attachments')
  })
})
