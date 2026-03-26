import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-route-helpers'

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await auth.supabase.from('invite_codes').delete().eq('id', id)
  if (error) {
    if ((error as any).code === 'PGRST205') {
      return NextResponse.json(
        { error: 'invite_codes table not found. Please apply migrations 000018_admin_invites_analytics.sql and 000019_invite_code_multi_use.sql.' },
        { status: 503 }
      )
    }
    console.error('admin/invites DELETE', error)
    return NextResponse.json({ error: 'Failed to delete invite code' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

