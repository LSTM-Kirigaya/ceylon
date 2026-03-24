import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createServiceClient, createAuthenticatedClient } from '../utils/supabase-client'
import { generateTestId } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'
import { SELECT_OPTION_COLOR_GROUPS } from '../../lib/selectOptionColors'

/**
 * Dynamic view columns + requirement.custom_values (migration 000014).
 * Skips when table or RPC is not deployed.
 */

test.describe('Version view columns & custom_values', () => {
  const supabase = createServiceClient()
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  let ownerId: string | null = null
  let ownerEmail: string | null = null
  const ownerPassword = 'testpassword123'
  let projectId: string | null = null
  let viewId: string | null = null
  let hasColumnsTable = false

  test.beforeAll(async () => {
    const probe = await supabase.from('version_view_columns').select('id').limit(1)
    hasColumnsTable = probe.error === null

    const testId = generateTestId()
    ownerEmail = `col_test_${testId}@example.com`
    const { data: user } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    })
    ownerId = user.user?.id || null
    if (ownerId) globalCleanup.trackUser(ownerId)

    const { data: project } = await supabase
      .from('projects')
      .insert({ name: `Col Test ${testId}`, owner_id: ownerId })
      .select()
      .single()
    projectId = project?.id || null
    if (projectId) globalCleanup.trackProject(projectId)

    const { data: view } = await supabase
      .from('version_views')
      .insert({ project_id: projectId, name: 'Grid View' })
      .select()
      .single()
    viewId = view?.id || null
    if (viewId) globalCleanup.trackView(viewId)
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
  })

  test('select option palette has 30 groups', () => {
    expect(SELECT_OPTION_COLOR_GROUPS.length).toBe(30)
  })

  test('should insert column and merge custom_values on requirement', async () => {
    if (!hasColumnsTable || !viewId || !ownerId || !projectId) {
      test.skip()
      return
    }

    const { data: col, error: ce } = await supabase
      .from('version_view_columns')
      .insert({
        version_view_id: viewId,
        name: '状态',
        field_type: 'select',
        options: ['A', 'B'],
        position: 0,
      })
      .select()
      .single()
    expect(ce).toBeNull()
    expect(col?.id).toBeTruthy()

    const { data: nextNum } = await supabase.rpc('get_next_requirement_number', { p_version_view_id: viewId })
    const { data: req, error: re } = await supabase
      .from('requirements')
      .insert({
        version_view_id: viewId,
        requirement_number: nextNum || 0,
        title: 'Row with custom',
        type: 'Feature',
        status: 'pending',
        created_by: ownerId,
        custom_values: { [col!.id]: 'A' },
      })
      .select()
      .single()
    expect(re).toBeNull()
    expect(req?.custom_values).toBeTruthy()
    expect((req?.custom_values as Record<string, string>)[col!.id]).toBe('A')
    if (req) globalCleanup.trackRequirement(req.id)

    const { data: merged, error: ue } = await supabase
      .from('requirements')
      .update({
        custom_values: { ...(req!.custom_values as object), [col!.id]: 'B' },
      })
      .eq('id', req!.id)
      .select()
      .single()
    expect(ue).toBeNull()
    expect((merged?.custom_values as Record<string, string>)[col!.id]).toBe('B')
  })

  test('strip_requirement_custom_column removes key for authenticated writer', async () => {
    if (!hasColumnsTable || !viewId || !ownerId || !ownerEmail) {
      test.skip()
      return
    }

    const { data: col, error: ce } = await supabase
      .from('version_view_columns')
      .insert({
        version_view_id: viewId,
        name: 'Temp',
        field_type: 'text',
        options: [],
        position: 99,
      })
      .select()
      .single()
    expect(ce).toBeNull()

    const { data: nextNum } = await supabase.rpc('get_next_requirement_number', { p_version_view_id: viewId })
    const { data: req, error: re } = await supabase
      .from('requirements')
      .insert({
        version_view_id: viewId,
        requirement_number: nextNum || 0,
        title: 'Strip test',
        type: 'Feature',
        status: 'pending',
        created_by: ownerId,
        custom_values: { [col!.id]: 'x' },
      })
      .select()
      .single()
    expect(re).toBeNull()
    if (req) globalCleanup.trackRequirement(req.id)

    const anon = createClient(url, anonKey)
    const { data: session, error: se } = await anon.auth.signInWithPassword({
      email: ownerEmail!,
      password: ownerPassword,
    })
    expect(se).toBeNull()
    const token = session.session?.access_token
    expect(token).toBeTruthy()
    const userSb = createAuthenticatedClient(token!)

    const { error: rpcErr } = await userSb.rpc('strip_requirement_custom_column', {
      p_view_id: viewId,
      p_key: col!.id,
    })
    expect(rpcErr).toBeNull()

    const { data: after } = await supabase.from('requirements').select('custom_values').eq('id', req!.id).single()
    const cv = after?.custom_values as Record<string, string> | null
    expect(cv?.[col!.id]).toBeUndefined()

    await supabase.from('version_view_columns').delete().eq('id', col!.id)
  })
})
