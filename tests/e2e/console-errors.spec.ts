import { test, expect } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'

function attachConsoleGuards(page: import('@playwright/test').Page) {
  const errors: string[] = []

  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err?.message ?? String(err)}`)
  })

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    errors.push(`console.error: ${msg.text()}`)
  })

  return {
    assertNoErrors: async () => {
      expect(errors, errors.join('\n')).toEqual([])
    },
  }
}

test.describe('Console sanity', () => {
  test('public pages should have no console errors', async ({ page }) => {
    const guard = attachConsoleGuards(page)

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await page.goto('/blog')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /开发博客|Dev Blog|ブログ/i })).toBeVisible()

    await guard.assertNoErrors()
  })

  test('dashboard should have no console errors', async ({ page }) => {
    const guard = attachConsoleGuards(page)

    await signInUser(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    await guard.assertNoErrors()
  })
})

