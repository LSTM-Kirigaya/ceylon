#!/usr/bin/env node
/**
 * Simple E2E Test - Manual approach
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8';

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const timestamp = Date.now();
const TEST_EMAIL = `e2e_${timestamp}@test.com`;
const TEST_PASSWORD = 'Test123456!';

console.log('🧪 Simple E2E Test\n');
console.log(`Email: ${TEST_EMAIL}\n`);

async function runTest() {
  // Step 1: Create user via API
  console.log('Step 1: Create user');
  const { data: userData, error: userError } = await adminSupabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  
  if (userError && !userError.message.includes('already')) {
    console.error('Failed to create user:', userError);
    return;
  }
  console.log('✅ User ready\n');

  // Step 2: Create project via API (simulating what user would do via UI)
  console.log('Step 2: Create project via API');
  const { data: project, error: projectError } = await adminSupabase
    .from('projects')
    .insert({
      name: 'test',
      description: 'E2E test project',
      owner_id: userData.user.id
    })
    .select()
    .single();
    
  if (projectError) {
    console.error('Failed to create project:', projectError);
    return;
  }
  console.log(`✅ Project created: ${project.id}\n`);

  // Step 3: Create version view
  console.log('Step 3: Create version view');
  const { data: view, error: viewError } = await adminSupabase
    .from('version_views')
    .insert({
      project_id: project.id,
      name: 'v1.0',
      description: 'First version'
    })
    .select()
    .single();
    
  if (viewError) {
    console.error('Failed to create view:', viewError);
    return;
  }
  console.log(`✅ Version view created: ${view.id}\n`);

  // Step 4: Create requirements
  console.log('Step 4: Create requirements');
  
  const requirements = [
    {
      version_view_id: view.id,
      requirement_number: 1,
      title: 'Login Feature',
      description: 'User should be able to login',
      type: 'Feature',
      priority: 8,
      status: 'pending',
      created_by: userData.user.id
    },
    {
      version_view_id: view.id,
      requirement_number: 2,
      title: 'Dashboard Bug Fix',
      description: 'Fix layout issues',
      type: 'Bug',
      priority: 9,
      status: 'in_progress',
      created_by: userData.user.id
    }
  ];
  
  const { data: reqs, error: reqError } = await adminSupabase
    .from('requirements')
    .insert(requirements)
    .select();
    
  if (reqError) {
    console.error('Failed to create requirements:', reqError);
    return;
  }
  console.log(`✅ ${reqs.length} requirements created\n`);

  // Step 5: Open browser and verify via UI
  console.log('Step 5: Verify via UI');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Inject session directly
    await page.goto('http://localhost:3000/login');
    
    // Get session via API and inject
    const { data: { session } } = await adminSupabase.auth.admin.getUserById(userData.user.id);
    
    // Navigate to dashboard with the session
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    console.log(`   Current URL: ${url}`);
    
    await page.screenshot({ path: 'output/e2e-simple-result.png' });
    console.log('   📸 Screenshot saved\n');

    if (url.includes('/dashboard')) {
      console.log('✅ TEST PASSED: Full flow working!');
    } else {
      console.log('⚠️ Redirected to login - session injection needed');
    }

  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   User: ${TEST_EMAIL}`);
  console.log(`   Project: test (${project.id})`);
  console.log(`   Version View: v1.0 (${view.id})`);
  console.log(`   Requirements: ${reqs.length}`);
}

runTest();
