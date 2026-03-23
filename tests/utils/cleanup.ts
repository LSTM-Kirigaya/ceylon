import { createServiceClient } from './supabase-client'

/**
 * Cleanup utilities for idempotent tests
 * Tracks and removes all test data created during tests
 */

export class TestCleanup {
  private projectIds: string[] = []
  private viewIds: string[] = []
  private requirementIds: string[] = []
  private userIds: string[] = []

  trackProject(id: string) {
    this.projectIds.push(id)
  }

  trackView(id: string) {
    this.viewIds.push(id)
  }

  trackRequirement(id: string) {
    this.requirementIds.push(id)
  }

  trackUser(id: string) {
    this.userIds.push(id)
  }

  async cleanupAll() {
    const supabase = createServiceClient()

    // Delete in reverse order of dependencies
    // 1. Delete requirements
    for (const id of this.requirementIds) {
      await supabase.from('requirements').delete().eq('id', id)
    }

    // 2. Delete version views
    for (const id of this.viewIds) {
      await supabase.from('version_views').delete().eq('id', id)
    }

    // 3. Delete projects (this will cascade delete project_members)
    for (const id of this.projectIds) {
      await supabase.from('projects').delete().eq('id', id)
    }

    // 4. Delete test users (this will cascade delete profiles)
    for (const id of this.userIds) {
      await supabase.auth.admin.deleteUser(id)
    }

    // Clear tracking arrays
    this.projectIds = []
    this.viewIds = []
    this.requirementIds = []
    this.userIds = []
  }

  async cleanupProjects() {
    const supabase = createServiceClient()
    for (const id of this.projectIds) {
      await supabase.from('projects').delete().eq('id', id)
    }
    this.projectIds = []
  }

  async cleanupViews() {
    const supabase = createServiceClient()
    for (const id of this.viewIds) {
      await supabase.from('version_views').delete().eq('id', id)
    }
    this.viewIds = []
  }

  async cleanupRequirements() {
    const supabase = createServiceClient()
    for (const id of this.requirementIds) {
      await supabase.from('requirements').delete().eq('id', id)
    }
    this.requirementIds = []
  }
}

// Global cleanup instance for test hooks
export const globalCleanup = new TestCleanup()
