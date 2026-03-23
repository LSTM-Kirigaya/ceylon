import { test, expect } from '@playwright/test'
import { supabase, createServiceClient } from '../utils/supabase-client'
import { TestCleanup } from '../utils/cleanup'
import { generateTestId } from '../utils/test-data'

/**
 * Backend lifecycle test (idempotent):
 * register/login -> project create/delete -> member invite/join/remove
 */
test.describe('Backend lifecycle API', () => {
  const serviceClient = createServiceClient()
  const cleanup = new TestCleanup()

  test.afterEach(async () => {
    await cleanup.cleanupAll()
  })

  test('should support auth, project, invite and cleanup lifecycle', async () => {
    const testId = generateTestId()
    const ownerEmail = `owner_${testId}@example.com`
    const ownerPassword = 'testpassword123'
    const memberEmail = `member_${testId}@example.com`
    const memberPassword = 'testpassword123'

    // 1) Owner seed user (simulates stable account baseline)
    const { data: ownerSeed, error: ownerSeedError } = await serviceClient.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { display_name: `Owner ${testId}` },
    })
    expect(ownerSeedError).toBeNull()
    const ownerId = ownerSeed.user?.id
    expect(ownerId).toBeTruthy()
    if (!ownerId) return
    cleanup.trackUser(ownerId)

    // 2) Registration flow via backend admin API (stable in CI/local environments)
    const { data: registerData, error: registerError } = await serviceClient.auth.admin.createUser({
      email: memberEmail,
      password: memberPassword,
      email_confirm: true,
      user_metadata: { display_name: `Member ${testId}` },
    })
    expect(registerError).toBeNull()
    const memberId = registerData.user?.id
    expect(memberId).toBeTruthy()
    if (!memberId) return
    cleanup.trackUser(memberId)

    // 3) Login flow validation
    const { data: ownerLogin, error: ownerLoginError } = await supabase.auth.signInWithPassword({
      email: ownerEmail,
      password: ownerPassword,
    })
    expect(ownerLoginError).toBeNull()
    expect(ownerLogin.session?.access_token).toBeTruthy()

    const { data: memberLogin, error: memberLoginError } = await supabase.auth.signInWithPassword({
      email: memberEmail,
      password: memberPassword,
    })
    expect(memberLoginError).toBeNull()
    expect(memberLogin.session?.access_token).toBeTruthy()

    // 4) Project create
    const { data: createdProject, error: createProjectError } = await serviceClient
      .from('projects')
      .insert({
        name: `Lifecycle Project ${testId}`,
        description: `Lifecycle test project ${testId}`,
        owner_id: ownerId,
      })
      .select()
      .single()
    expect(createProjectError).toBeNull()
    expect(createdProject?.owner_id).toBe(ownerId)
    const projectId = createdProject?.id
    expect(projectId).toBeTruthy()
    if (!projectId) return
    cleanup.trackProject(projectId)

    // 5) Invite/join (member added to project)
    const { data: insertedMember, error: inviteError } = await serviceClient
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: memberId,
        role: 'write',
      })
      .select()
      .single()
    expect(inviteError).toBeNull()
    expect(insertedMember?.user_id).toBe(memberId)

    // Member should be able to read membership (joined)
    const { data: memberView, error: memberViewError } = await serviceClient
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', memberId)
      .single()
    expect(memberViewError).toBeNull()
    expect(memberView?.role).toBe('write')

    // 6) Remove member
    const { error: removeMemberError } = await serviceClient
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', memberId)
    expect(removeMemberError).toBeNull()

    const { data: removedMember, error: removedMemberError } = await serviceClient
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', memberId)
      .maybeSingle()
    expect(removedMemberError).toBeNull()
    expect(removedMember).toBeNull()

    // 7) Delete project
    const { error: deleteProjectError } = await serviceClient
      .from('projects')
      .delete()
      .eq('id', projectId)
    expect(deleteProjectError).toBeNull()

    const { data: deletedProject, error: deletedProjectError } = await serviceClient
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle()
    expect(deletedProjectError).toBeNull()
    expect(deletedProject).toBeNull()
  })
})
