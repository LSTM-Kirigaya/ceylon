# Ceylon Test Suite

Comprehensive test suite for the Ceylon project management application.

## Test Structure

```
tests/
├── e2e/                    # End-to-End tests (Playwright)
│   ├── auth.spec.ts       # Authentication flows
│   ├── project.spec.ts    # Project management
│   ├── version-view.spec.ts # Version views
│   └── requirement.spec.ts # Requirements management
├── api/                    # API tests
│   ├── projects.api.spec.ts
│   ├── version-views.api.spec.ts
│   ├── requirements.api.spec.ts
│   ├── members.api.spec.ts
│   └── cli.api.spec.ts
├── db/                     # Database tests
│   ├── rls.spec.ts        # Row Level Security policies
│   └── functions.spec.ts  # PostgreSQL functions
├── utils/                  # Test utilities
│   ├── test-data.ts       # Test data generators
│   ├── supabase-client.ts # Supabase clients
│   ├── cleanup.ts         # Cleanup utilities
│   └── auth-helper.ts     # Auth helpers
└── README.md
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test suites
```bash
# E2E tests only
npm run test:e2e

# API tests only
npm run test:api

# Database tests only
npm run test:db

# Specific test file
npx playwright test tests/e2e/project.spec.ts
```

### Run with UI mode (for debugging)
```bash
npm run test:ui
```

### Run with headed browser (see browser)
```bash
npm run test:headed
```

### CI mode
```bash
npm run test:ci
```

## Test Coverage

### E2E Tests
- **Authentication**: Login, logout, registration, session persistence
- **Projects**: Create, read, update, delete projects
- **Version Views**: Create, switch, update, delete views
- **Requirements**: Create, filter, update, assign, delete requirements

### API Tests
- **Projects**: CRUD operations via Supabase client
- **Version Views**: CRUD with cascade delete verification
- **Requirements**: CRUD with requirement number generation
- **Members**: Add, update roles, remove members
- **CLI API**: All CLI endpoints with authentication

### Database Tests
- **RLS Policies**: Verify row-level security works correctly
- **Functions**: Test PostgreSQL functions and triggers
- **Constraints**: Verify unique constraints and validations
- **Cascade Deletes**: Ensure related records are cleaned up

## Idempotency

All tests are designed to be idempotent:
- Each test creates its own test data
- Global cleanup tracks all created resources
- After each test suite, all test data is removed
- Tests can be run multiple times without conflicts

## Environment Variables

Required for testing:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Test User (optional, defaults will be used)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

## Writing New Tests

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test'
import { signInUser } from '../utils/auth-helper'
import { createTestProjectData } from '../utils/test-data'
import { globalCleanup } from '../utils/cleanup'

test('should do something', async ({ page }) => {
  await signInUser(page)
  
  const testData = createTestProjectData()
  // ... test logic
  
  // Cleanup is handled automatically
})
```

### API Test Example
```typescript
import { test, expect } from '@playwright/test'
import { createServiceClient } from '../utils/supabase-client'
import { globalCleanup } from '../utils/cleanup'

test('should create via API', async () => {
  const supabase = createServiceClient()
  
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: 'Test' })
    .select()
    .single()
  
  if (data) {
    globalCleanup.trackProject(data.id)
  }
  
  expect(error).toBeNull()
})
```

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

Results are uploaded as artifacts including:
- Playwright HTML report
- Screenshots of failed tests
- Videos of failed tests (if enabled)

## Debugging Failed Tests

1. Run with UI mode: `npm run test:ui`
2. Check screenshots in `test-results/` directory
3. View HTML report: `npm run test:report`
4. Run single test: `npx playwright test --grep "test name"`

## Best Practices

1. **Always cleanup**: Use `globalCleanup` to track resources
2. **Use test data generators**: Ensures unique data
3. **Test isolation**: Each test should be independent
4. **Error handling**: Always check for errors in API tests
5. **Assertions**: Make specific assertions, not just `toBeDefined()`
