/**
 * Client-side uploads go through Next.js API routes (no Supabase keys in the browser).
 */

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  ATTACHMENTS: 'attachments',
  PROJECT_ICONS: 'project-icons',
} as const

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]

export async function uploadProjectIcon(
  projectId: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', String(projectId).trim())
    const res = await fetch('/api/storage/project-icon', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { url: null, error: new Error(data.error || 'Upload failed') }
    }
    return { url: data.url ?? null, error: null }
  } catch (e) {
    return { url: null, error: e instanceof Error ? e : new Error('Upload failed') }
  }
}
