import { test, expect } from '@playwright/test'
import { supabase, createServiceClient } from '../utils/supabase-client'
import { TestCleanup } from '../utils/cleanup'
import { generateTestId } from '../utils/test-data'

/**
 * Auth state API tests (idempotent)
 */
test.describe('Auth state API', () => {
  const serviceClient = createServiceClient()
  const cleanup = new TestCleanup()

  test.afterEach(async () => {
    await cleanup.cleanupAll()
  })

  test('should support register, login, auth-state and logout', async () => {
    const testId = generateTestId()
    const email = `auth_state_${testId}@example.com`
    const password = 'testpassword123'

    const { data: registerData, error: registerError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `Auth State ${testId}` },
    })
    expect(registerError).toBeNull()
    const userId = registerData.user?.id
    expect(userId).toBeTruthy()
    if (!userId) return
    cleanup.trackUser(userId)

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    expect(loginError).toBeNull()
    expect(loginData.session?.access_token).toBeTruthy()

    const { data: selfData, error: selfError } = await supabase.auth.getUser()
    expect(selfError).toBeNull()
    expect(selfData.user?.email).toBe(email)

    const { error: invalidLoginError } = await supabase.auth.signInWithPassword({
      email,
      password: 'wrong-password',
    })
    expect(invalidLoginError).not.toBeNull()

    const { error: signOutError } = await supabase.auth.signOut()
    expect(signOutError).toBeNull()

    const { data: postLogoutUser, error: postLogoutError } = await supabase.auth.getUser()
    expect(postLogoutError).not.toBeNull()
    expect(postLogoutUser.user).toBeNull()
  })
})
