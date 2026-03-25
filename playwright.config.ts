import { loadEnvConfig } from '@next/env'
import { defineConfig, devices } from '@playwright/test'

// Load `.env.development` (and siblings) the same way Next does, so CI/local
// do not need `set -a && . ./.env.development` before `playwright test`.
const prevNodeEnv = process.env.NODE_ENV
process.env.NODE_ENV = 'development'
loadEnvConfig(process.cwd())
process.env.NODE_ENV = prevNodeEnv

/**
 * Playwright configuration for ceylonm tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  reporter: 'html',
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  // Firefox E2E is flaky against remote Supabase + dev server; run Chromium by default.
  // Set PLAYWRIGHT_ALL_BROWSERS=1 to include Firefox (e.g. in a dedicated job).
  projects: process.env.PLAYWRIGHT_ALL_BROWSERS
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      ]
    : [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        // CI runs `npm run build` first; production server starts reliably. `next dev` often hits the 120s timeout on cold CI.
        command: process.env.CI ? 'npm run start' : 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: process.env.CI ? 180_000 : 120_000,
        // Ensure Supabase and test creds reach the Next.js child (middleware requires SUPABASE_* at runtime).
        env: { ...process.env },
      },
})
