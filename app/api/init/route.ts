import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/supabase-env'

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())

    // Create storage buckets
    const buckets = ['avatars', 'attachments', 'project-icons']
    const bucketResults = []

    for (const bucketName of buckets) {
      try {
        const { data: existingBucket } = await supabase.storage.getBucket(bucketName)
        if (!existingBucket) {
          const { data, error } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          })
          if (error) {
            bucketResults.push({ bucket: bucketName, status: 'error', error: error.message })
          } else {
            bucketResults.push({ bucket: bucketName, status: 'created' })
          }
        } else {
          bucketResults.push({ bucket: bucketName, status: 'exists' })
        }
      } catch (error: any) {
        bucketResults.push({ bucket: bucketName, status: 'error', error: error.message })
      }
    }

    return NextResponse.json({
      message: 'Buckets initialization attempted',
      buckets: bucketResults,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
