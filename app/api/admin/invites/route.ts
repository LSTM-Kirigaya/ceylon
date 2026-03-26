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
    .select('id, code, note, created_at, expires_at, max_uses, remaining_uses')
    .order('created_at', { ascending: false })

  if (error) {
    // When migrations haven't been applied to the target database yet.
    if ((error as any).code === 'PGRST205') {
      return NextResponse.json(
        { error: 'invite_codes table not found. Please apply migrations 000018_admin_invites_analytics.sql and 000019_invite_code_multi_use.sql.' },
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
  const validityDays = typeof body.validityDays === 'number' ? body.validityDays : Number(body.validityDays)
  const uses = typeof body.uses === 'number' ? body.uses : Number(body.uses)
  const safeDays = [7, 30, 60, 90, 180].includes(validityDays) ? validityDays : null
  const safeUses = Number.isFinite(uses) && uses >= 1 && uses <= 1000 ? Math.floor(uses) : 1

  const expiresAt =
    safeDays != null ? new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000).toISOString() : null

  const { data: created, error } = await auth.supabase
    .from('invite_codes')
    .insert({
      code,
      note,
      created_by: auth.user.id,
      expires_at: expiresAt,
      max_uses: safeUses,
      remaining_uses: safeUses,
    })
    .select('id, code, note, created_at, expires_at, max_uses, remaining_uses')
    .single()

  if (error) {
    if ((error as any).code === 'PGRST205') {
      return NextResponse.json(
        { error: 'invite_codes table not found. Please apply migrations 000018_admin_invites_analytics.sql and 000019_invite_code_multi_use.sql.' },
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
