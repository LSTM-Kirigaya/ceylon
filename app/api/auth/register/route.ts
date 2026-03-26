import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

function normalizeInviteCode(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
    const inviteCode = normalizeInviteCode(body.inviteCode)

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
    }

    const service = createServiceRoleClient()
    const normalized = inviteCode
    const { data: inviteRow, error: inviteErr } = await service
      .from('invite_codes')
      .select('id, code, used_by, expires_at')
      .eq('code', normalized)
      .maybeSingle()

    if (inviteErr || !inviteRow) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 })
    }
    if (inviteRow.used_by) {
      return NextResponse.json({ error: 'This invite code has already been used' }, { status: 400 })
    }
    if (inviteRow.expires_at && new Date(inviteRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite code has expired' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || undefined,
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const newUser = data.user
    if (newUser?.id) {
      const { data: updated, error: consumeErr } = await service
        .from('invite_codes')
        .update({ used_by: newUser.id, used_at: new Date().toISOString() })
        .eq('id', inviteRow.id)
        .is('used_by', null)
        .select('id')
        .maybeSingle()

      if (consumeErr || !updated) {
        await service.auth.admin.deleteUser(newUser.id)
        return NextResponse.json(
          { error: 'Could not complete registration with this invite code. Please try again.' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
    })
  } catch (e) {
    console.error('auth/register', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
