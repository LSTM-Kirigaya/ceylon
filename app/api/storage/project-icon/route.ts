import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabaseUser, unauthorized } from '@/lib/api-route-helpers'
import { createServiceRoleClient } from '@/lib/supabase-server'

const BUCKET = 'project-icons'

export async function POST(request: NextRequest) {
  const { user } = await getRouteSupabaseUser()
  if (!user) return unauthorized()
  const service = createServiceRoleClient()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectIdRaw = formData.get('projectId')
    let projectId: string | null = null
    if (typeof projectIdRaw === 'string') {
      projectId = projectIdRaw.trim()
    } else if (projectIdRaw instanceof Blob) {
      projectId = (await projectIdRaw.text()).trim()
    }
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    // Explicit authorization: confirm the caller is the project owner.
    // Avoid relying on storage.objects RLS policies (which can be brittle across environments).
    const { data: projectRow, error: projectErr } = await service
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (projectErr || !projectRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${projectId}/${fileName}`

    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: pub } = service.storage.from(BUCKET).getPublicUrl(filePath)

    return NextResponse.json({ url: pub.publicUrl, path: filePath })
  } catch (e) {
    console.error('project-icon upload', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
