import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireAdmin } from '@/lib/api-route-helpers'

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase()
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { data, error } = await supabase
    .from('invite_codes')
    .select('id, code, note, created_at, expires_at, used_at, used_by')
    .order('created_at', { ascending: false })

  if (error) {
    // When migrations haven't been applied to the target database yet.
    if ((error as any).code === 'PGRST205') {
      return NextResponse.json(
        { error: 'invite_codes table not found. Please apply migration 000018_admin_invites_analytics.sql.' },
        { status: 503 }
      )
    }
    console.error('admin/invites GET', error)
    return NextResponse.json({ error: 'Failed to list invite codes' }, { status: 500 })
  }

  return NextResponse.json({ invites: data ?? [], currentUserId: user.id })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const code =
    typeof body.code === 'string' && body.code.trim()
      ? normalizeCode(body.code)
      : normalizeCode(randomBytes(8).toString('hex'))
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : null
  const expiresAt =
    typeof body.expiresAt === 'string' && body.expiresAt ? new Date(body.expiresAt).toISOString() : null

  const { data: created, error } = await auth.supabase
    .from('invite_codes')
    .insert({
      code,
      note,
      created_by: auth.user.id,
      expires_at: expiresAt,
    })
    .select('id, code, note, created_at, expires_at')
    .single()

  if (error) {
    if ((error as any).code === 'PGRST205') {
      return NextResponse.json(
        { error: 'invite_codes table not found. Please apply migration 000018_admin_invites_analytics.sql.' },
        { status: 503 }
      )
    }
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This invite code already exists' }, { status: 400 })
    }
    console.error('admin/invites POST', error)
    return NextResponse.json({ error: 'Failed to create invite code' }, { status: 500 })
  }

  return NextResponse.json({ invite: created })
}
