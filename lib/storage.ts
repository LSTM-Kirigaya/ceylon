import { supabase } from './supabase'

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  ATTACHMENTS: 'attachments',
} as const

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]

/**
 * Initialize storage buckets (should be called once during app setup)
 */
export async function initializeStorage(): Promise<void> {
  const buckets = Object.values(STORAGE_BUCKETS)
  
  for (const bucketName of buckets) {
    try {
      const { data: existingBucket } = await supabase
        .storage
        .getBucket(bucketName)
      
      if (!existingBucket) {
        await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
        })
      }
    } catch (error) {
      console.log(`Bucket ${bucketName} may already exist or error:`, error)
    }
  }
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File
): Promise<{ data: { path: string } | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

  return { data, error }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  return { error }
}

/**
 * Upload avatar for user
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { data, error } = await uploadFile(STORAGE_BUCKETS.AVATARS, filePath, file)
  
  if (error) {
    return { url: null, error }
  }

  const publicUrl = getPublicUrl(STORAGE_BUCKETS.AVATARS, filePath)
  return { url: publicUrl, error: null }
}

/**
 * Delete user's avatar
 */
export async function deleteAvatar(path: string): Promise<{ error: Error | null }> {
  return deleteFile(STORAGE_BUCKETS.AVATARS, path)
}
