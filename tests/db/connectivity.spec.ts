import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'

/**
 * Database connectivity and basic metadata checks (read-only)
 */
test.describe('Database connectivity', () => {
  const supabase = createServiceClient()
  const coreTables = ['profiles', 'projects', 'project_members', 'version_views', 'requirements']

  test('should connect to database using environment variables', async () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy()
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy()
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy()
  })

  test('should read basic information from core tables', async () => {
    for (const tableName of coreTables) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      expect(error, `读取 ${tableName} 失败`).toBeNull()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })
})
