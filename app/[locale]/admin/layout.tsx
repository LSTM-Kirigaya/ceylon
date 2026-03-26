import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminShell from '@/components/admin/AdminShell'
import type { Locale } from '@/i18n/config'

export default async function AdminLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_user')) {
    redirect('/dashboard')
  }
  return <AdminShell locale={locale}>{children}</AdminShell>
}
