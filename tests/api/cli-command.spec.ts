import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { globalCleanup } from '../utils/cleanup'
import { createTestProjectData, createTestVersionViewData, createTestRequirementData, generateTestId } from '../utils/test-data'
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '')
}

test.describe('CLI command (local binary) - smoke', () => {
  test.describe.configure({ timeout: 120_000, mode: 'serial' })

  const service = createServiceClient()
  const testId = generateTestId()
  const email = `cli_cmd_${testId}@example.com`
  const password = 'testpassword123'
  const displayName = `CliCmd_${testId}`

  let userId = ''
  let projectId = ''
  let viewId = ''

  // tmp home for cli config: ~/.ceylon/token
  const tmpHome = path.join(__dirname, '..', 'test-results', 'tmp-cli-home', testId)

  test.beforeAll(async () => {
    const { data: user, error: userErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })
    if (userErr) throw userErr

    userId = user.user?.id || ''
    expect(userId).toBeTruthy()
    globalCleanup.trackUser(userId)

    const login = await service.auth.signInWithPassword({ email, password })
    expect(login.error).toBeNull()
    const token = login.data.session?.access_token
    expect(token).toBeTruthy()

    const projectData = createTestProjectData()
    const { data: project, error: projectErr } = await service
      .from('projects')
      .insert({ name: projectData.name, owner_id: userId, description: projectData.description ?? null })
      .select()
      .single()
    if (projectErr) throw projectErr
    projectId = project?.id || ''
    expect(projectId).toBeTruthy()
    globalCleanup.trackProject(projectId)

    const viewData = createTestVersionViewData()
    const { data: view, error: viewErr } = await service
      .from('version_views')
      .insert({ project_id: projectId, name: viewData.name, description: viewData.description ?? null })
      .select()
      .single()
    if (viewErr) throw viewErr
    viewId = view?.id || ''
    expect(viewId).toBeTruthy()
    // cleanup for views happens in cleanupAll via trackView; but cli_command spec doesn't update view
    // (we'll add it to track to be consistent with other tests).
    globalCleanup.trackView(viewId)

    fs.mkdirSync(path.join(tmpHome, '.ceylon'), { recursive: true })
    fs.writeFileSync(path.join(tmpHome, '.ceylon', 'token'), token!, { encoding: 'utf-8', mode: 0o600 })
  })

  test.afterAll(async () => {
    await globalCleanup.cleanupAll()
    try {
      fs.rmSync(tmpHome, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  function runCli(args: string[]) {
    const cliEntry = path.join(__dirname, '..', '..', 'cli', 'dist', 'index.js')
    const res = spawnSync('node', [cliEntry, ...args], {
      env: {
        ...process.env,
        HOME: tmpHome,
        CEYLON_API_URL: 'http://localhost:3000/api',
      },
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    })

    const stdout = res.stdout ? stripAnsi(res.stdout) : ''
    const stderr = res.stderr ? stripAnsi(res.stderr) : ''

    if (res.status !== 0) {
      // eslint-disable-next-line no-console
      console.log('CLI stdout:\n', stdout)
      // eslint-disable-next-line no-console
      console.log('CLI stderr:\n', stderr)
    }

    return { status: res.status ?? 1, stdout, stderr }
  }

  test('projects/views/requirements create/update should work', async () => {
    // projects
    const projectsRes = runCli(['projects'])
    expect(projectsRes.status).toBe(0)
    expect(projectsRes.stdout).toContain('Your Projects:')
    expect(projectsRes.stdout).toContain(projectId)

    // views
    const viewsRes = runCli(['views', '-p', projectId])
    expect(viewsRes.status).toBe(0)
    expect(viewsRes.stdout).toContain('Version Views:')
    expect(viewsRes.stdout).toContain(viewId)

    // create requirement
    const reqData = createTestRequirementData()
    const createRes = runCli([
      'create',
      '-v',
      viewId,
      '-t',
      reqData.title,
      '-d',
      reqData.description,
      '--priority',
      String(reqData.priority),
      '--type',
      reqData.type,
    ])
    expect(createRes.status).toBe(0)
    expect(createRes.stdout).toContain('✓ Requirement created successfully!')

    // extract reqId from stdout
    const m = createRes.stdout.match(/ID:\s*([0-9a-fA-F-]+)/)
    expect(m).toBeTruthy()
    const reqId = m![1]
    globalCleanup.trackRequirement(reqId)

    // requirements list
    const listRes = runCli(['requirements', '-v', viewId])
    expect(listRes.status).toBe(0)
    expect(listRes.stdout).toContain(reqData.title)

    // update requirement
    const updatedTitle = `Updated_${reqData.title}_${testId}`
    const updateRes = runCli(['update', reqId, '--title', updatedTitle, '--status', 'in_progress'])
    expect(updateRes.status).toBe(0)
    expect(updateRes.stdout).toContain('✓ Requirement updated successfully!')

    const { data: updated, error: updatedErr } = await service
      .from('requirements')
      .select('title,status')
      .eq('id', reqId)
      .single()
    expect(updatedErr).toBeNull()
    expect(updated?.title).toBe(updatedTitle)
    expect(updated?.status).toBe('in_progress')
  })

  test('unauthorized cli token should fail', async () => {
    // Overwrite token with invalid value in tmp home
    fs.writeFileSync(path.join(tmpHome, '.ceylon', 'token'), 'invalid_token_123', { encoding: 'utf-8' })

    const res = runCli(['projects'])
    expect(res.status).not.toBe(0)
    expect(res.stderr + res.stdout).toMatch(/Not authenticated|Authentication expired/i)
  })
})

