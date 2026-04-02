import type { SupabaseClient } from '@supabase/supabase-js'
import type { Requirement, VersionView, VersionViewColumn } from '@/types'

export type VersionViewDataSnapshot = {
  view: VersionView
  columns: VersionViewColumn[]
  requirements: Requirement[]
}

export async function buildVersionViewDataSnapshot(
  supabase: SupabaseClient,
  viewId: string
): Promise<VersionViewDataSnapshot> {
  const { data: view, error: viewErr } = await supabase.from('version_views').select('*').eq('id', viewId).single()
  if (viewErr || !view) throw new Error(viewErr?.message || 'Version view not found')

  const { data: columns, error: colErr } = await supabase
    .from('version_view_columns')
    .select('*')
    .eq('version_view_id', viewId)
    .order('position', { ascending: true })
  if (colErr) throw new Error(colErr.message)

  const { data: requirements, error: reqErr } = await supabase
    .from('requirements')
    .select('*')
    .eq('version_view_id', viewId)
    .order('requirement_number', { ascending: true })
  if (reqErr) throw new Error(reqErr.message)

  // Strip the nested `data` field from the view row to prevent recursive nesting
  const { data: _ignore, ...cleanView } = view

  return {
    view: cleanView as VersionView,
    columns: (columns ?? []) as VersionViewColumn[],
    requirements: (requirements ?? []) as Requirement[],
  }
}

export async function syncVersionViewData(
  supabase: SupabaseClient,
  viewId: string
): Promise<void> {
  const snap = await buildVersionViewDataSnapshot(supabase, viewId)
  const { error } = await supabase.from('version_views').update({ data: snap }).eq('id', viewId)
  if (error) throw new Error(error.message)
}

