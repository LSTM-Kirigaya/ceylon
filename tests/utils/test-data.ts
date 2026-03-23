/**
 * Test data generators for idempotent tests
 * All data created with these helpers should be cleaned up after tests
 */

export const generateTestId = () => `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

export const createTestProjectData = () => ({
  name: `Test Project ${generateTestId()}`,
  description: `Test project description ${generateTestId()}`,
})

export const createTestVersionViewData = () => ({
  name: `Test View ${generateTestId()}`,
  description: `Test version view description ${generateTestId()}`,
})

export const createTestRequirementData = (overrides: Partial<{
  title: string
  description: string
  priority: number
  type: string
}> = {}) => ({
  title: overrides.title || `Test Requirement ${generateTestId()}`,
  description: overrides.description || `Test requirement description ${generateTestId()}`,
  priority: overrides.priority ?? 5,
  type: overrides.type || 'Feature',
})

// Test user credentials (for development only)
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
}
