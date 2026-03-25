#!/usr/bin/env ts-node
/**
 * Test runner script for CI/CD integration
 * Runs all tests and reports results
 */

import { execSync } from 'child_process'

interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  duration?: number
  error?: string
}

const testSuites = [
  { name: 'E2E - Authentication', command: 'npx playwright test tests/e2e/auth.spec.ts' },
  { name: 'E2E - Projects', command: 'npx playwright test tests/e2e/project.spec.ts' },
  { name: 'E2E - Version Views', command: 'npx playwright test tests/e2e/version-view.spec.ts' },
  { name: 'E2E - Requirements', command: 'npx playwright test tests/e2e/requirement.spec.ts' },
  { name: 'API - Projects', command: 'npx playwright test tests/api/projects.api.spec.ts' },
  { name: 'API - Auth State', command: 'npx playwright test tests/api/auth-state.api.spec.ts' },
  { name: 'API - Backend Lifecycle', command: 'npx playwright test tests/api/backend-lifecycle.api.spec.ts' },
  { name: 'API - Version Views', command: 'npx playwright test tests/api/version-views.api.spec.ts' },
  { name: 'API - Requirements', command: 'npx playwright test tests/api/requirements.api.spec.ts' },
  { name: 'API - Members', command: 'npx playwright test tests/api/members.api.spec.ts' },
  { name: 'API - CLI', command: 'npx playwright test tests/api/cli.api.spec.ts' },
  { name: 'DB - Connectivity', command: 'npx playwright test tests/db/connectivity.spec.ts' },
  { name: 'DB - RLS Policies', command: 'npx playwright test tests/db/rls.spec.ts' },
  { name: 'DB - Functions', command: 'npx playwright test tests/db/functions.spec.ts' },
]

async function runTests() {
  console.log('🧪 Starting ceylonm Test Suite\n')
  
  const results: TestResult[] = []
  const startTime = Date.now()
  
  for (const suite of testSuites) {
    const suiteStart = Date.now()
    process.stdout.write(`Running ${suite.name}... `)
    
    try {
      execSync(suite.command, { stdio: 'pipe' })
      const duration = Date.now() - suiteStart
      results.push({ name: suite.name, status: 'passed', duration })
      console.log(`✅ (${duration}ms)`)
    } catch (error: any) {
      const duration = Date.now() - suiteStart
      results.push({ 
        name: suite.name, 
        status: 'failed', 
        duration,
        error: error.message 
      })
      console.log(`❌ (${duration}ms)`)
      if (process.env.CI) {
        // In CI, continue running all tests
        console.error(error.stdout?.toString())
      }
    }
  }
  
  const totalDuration = Date.now() - startTime
  
  // Print summary
  console.log('\n📊 Test Summary')
  console.log('=' .repeat(50))
  
  const passed = results.filter(r => r.status === 'passed').length
  const failed = results.filter(r => r.status === 'failed').length
  const skipped = results.filter(r => r.status === 'skipped').length
  
  console.log(`Total: ${results.length} tests`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`⏱️  Duration: ${totalDuration}ms`)
  
  if (failed > 0) {
    console.log('\nFailed Tests:')
    results
      .filter(r => r.status === 'failed')
      .forEach(r => console.log(`  - ${r.name}`))
  }
  
  console.log('')
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(error => {
  console.error('Test runner failed:', error)
  process.exit(1)
})
