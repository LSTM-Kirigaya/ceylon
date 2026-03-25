import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'

export async function POST(request: NextRequest) {
  const { supabase, user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()

  try {
    const formData = await request.formData()
    const rawFile = formData.get('file') as unknown
    const file = rawFile as (File & { name?: string; type?: string }) | null
    const userId = formData.get('userId') as string | null

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const mimeType = typeof file.type === 'string' ? file.type : ''
    if (mimeType && !allowedTypes.includes(mimeType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024
    const size = typeof file.size === 'number' ? file.size : 0
    if (size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const rawName = typeof file.name === 'string' ? file.name : ''
    const extFromName = rawName.includes('.') ? rawName.split('.').pop() : ''
    const extFromType = mimeType.includes('/') ? mimeType.split('/').pop() : ''
    const fileExt = (extFromName || extFromType || 'png').toLowerCase()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: mimeType || undefined,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const publicUrl = pub.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      url: publicUrl,
      message: 'Avatar uploaded successfully',
    })
  } catch (error) {
    console.error('Error in avatar upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
