import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-route-helpers'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - 6)
  windowStart.setHours(0, 0, 0, 0)

  const { count: totalViews, error: totalErr } = await supabase
    .from('site_page_views')
    .select('*', { count: 'exact', head: true })

  if (totalErr) {
    console.error('admin/analytics total', totalErr)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }

  const { data: rows, error: dayErr } = await supabase
    .from('site_page_views')
    .select('created_at')
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: true })

  if (dayErr) {
    console.error('admin/analytics series', dayErr)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }

  const byDay = new Map<string, number>()
  for (const r of rows ?? []) {
    const key = (r as { created_at: string }).created_at.slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + 1)
  }

  const last7Days: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    last7Days.push({ date: key, count: byDay.get(key) ?? 0 })
  }

  const { count: todayViews } = await supabase
    .from('site_page_views')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startToday.toISOString())

  return NextResponse.json({
    totalViews: totalViews ?? 0,
    todayViews: todayViews ?? 0,
    last7Days,
  })
}
