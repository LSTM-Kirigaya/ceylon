import { test } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'

test.describe('Analyze duplicate requests (manual)', () => {
  test('profile page reload request duplicates', async ({ page }) => {
    test.skip(!process.env.ANALYZE_DUP_REQUESTS, 'set ANALYZE_DUP_REQUESTS=1 to run')

    await signInUser(page)
    await page.goto('/profile')

    // Collect request URLs during reload window.
    const urls: string[] = []
    page.on('request', (req) => {
      const u = new URL(req.url())
      if (u.origin !== 'http://localhost:3000') return
      // Ignore static assets noise.
      if (u.pathname.startsWith('/_next/')) return
      urls.push(u.pathname + (u.search ? `?${u.searchParams.toString()}` : ''))
    })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const counts = new Map<string, number>()
    for (const u of urls) counts.set(u, (counts.get(u) ?? 0) + 1)

    const dupes = [...counts.entries()]
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          totalRequests: urls.length,
          duplicates: dupes.slice(0, 50).map(([url, count]) => ({ url, count })),
        },
        null,
        2
      )
    )
  })
})

