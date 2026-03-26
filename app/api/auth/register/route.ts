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
      const { data: consumed, error: consumeErr } = await service.rpc('consume_invite_code', {
        p_code: inviteCode,
        p_user_id: newUser.id,
      })

      const ok = Array.isArray(consumed) ? consumed[0]?.ok === true : (consumed as any)?.ok === true
      const reason = Array.isArray(consumed) ? consumed[0]?.reason : (consumed as any)?.reason

      if (consumeErr || !ok) {
        await service.auth.admin.deleteUser(newUser.id)
        const msg =
          reason === 'expired'
            ? 'This invite code has expired'
            : reason === 'exhausted'
              ? 'This invite code has already been used up'
              : reason === 'not_found'
                ? 'Invalid or expired invite code'
                : 'Could not complete registration with this invite code. Please try again.'
        return NextResponse.json({ error: msg }, { status: 409 })
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
