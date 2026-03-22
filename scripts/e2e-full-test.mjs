#!/usr/bin/env node
/**
 * End-to-End Full Flow Test
 * Login → Create Project → Create Version View → Add Requirements
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// 测试用户凭证
const TEST_EMAIL = 'e2e_test@ceylon.test';
const TEST_PASSWORD = 'Test123456!';
const TEST_NAME = 'E2E Test User';

console.log('🧪 E2E Full Flow Test\n');

async function ensureTestUser() {
  console.log('📋 Preparing test user...');
  
  // 检查用户是否已存在
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  
  let user = users.find(u => u.email === TEST_EMAIL);
  
  if (!user) {
    console.log('   Creating new test user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: TEST_NAME }
    });
    if (error) throw error;
    user = data.user;
    console.log(`   ✅ User created: ${user.id}`);
  } else {
    console.log(`   ✅ User exists: ${user.id}`);
  }
  
  // 确保 profile 存在
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (!profile) {
    console.log('   Creating profile...');
    await supabase.from('profiles').insert({
      id: user.id,
      email: TEST_EMAIL,
      display_name: TEST_NAME
    });
  }
  
  console.log('   ✅ Test user ready\n');
  return user;
}

async function runE2ETest() {
  const user = await ensureTestUser();
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // ==================== STEP 1: LOGIN ====================
    console.log('📋 STEP 1: Login');
    console.log('   Navigating to login...');
    
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForSelector('text=我的项目', { timeout: 10000 });
    console.log('   ✅ Logged in successfully\n');
    
    await page.screenshot({ path: 'output/e2e-01-dashboard.png' });

    // ==================== STEP 2: CREATE PROJECT ====================
    console.log('📋 STEP 2: Create Project "test"');
    
    // Click "新建项目" button
    await page.click('button:has-text("新建项目")');
    await page.waitForTimeout(500);
    
    // Fill project form
    await page.waitForSelector('input[name="name"]', { timeout: 5000 });
    await page.fill('input[name="name"]', 'test');
    await page.fill('textarea[name="description"]', 'This is a test project for E2E testing');
    
    // Submit
    await page.click('button:has-text("创建")');
    
    // Wait for project to be created (redirect or project list update)
    await page.waitForTimeout(2000);
    
    // Verify project was created
    const hasProject = await page.locator('text=test').first().isVisible();
    if (!hasProject) {
      throw new Error('Project was not created');
    }
    console.log('   ✅ Project "test" created\n');
    
    await page.screenshot({ path: 'output/e2e-02-project-created.png' });

    // ==================== STEP 3: CREATE VERSION VIEW ====================
    console.log('📋 STEP 3: Create Version View');
    
    // Click on the project card
    await page.click('text=test');
    await page.waitForTimeout(2000);
    
    // Check if we're on project page
    const currentUrl = page.url();
    if (!currentUrl.includes('/projects/')) {
      throw new Error('Not on project page after clicking project');
    }
    console.log(`   Navigated to: ${currentUrl}`);
    
    // Click "新建视图" button
    await page.click('button:has-text("新建视图")');
    await page.waitForTimeout(500);
    
    // Fill version view form
    await page.waitForSelector('input[name="name"]', { timeout: 5000 });
    await page.fill('input[name="name"]', 'v1.0');
    await page.fill('textarea[name="description"]', 'First version view');
    
    // Submit
    await page.click('button:has-text("创建")');
    await page.waitForTimeout(2000);
    
    // Verify tab was created
    const hasTab = await page.locator('text=v1.0').first().isVisible();
    if (!hasTab) {
      throw new Error('Version view was not created');
    }
    console.log('   ✅ Version view "v1.0" created\n');
    
    await page.screenshot({ path: 'output/e2e-03-version-view-created.png' });

    // ==================== STEP 4: ADD REQUIREMENTS ====================
    console.log('📋 STEP 4: Add Requirements');
    
    // Click "新建需求" button
    await page.click('button:has-text("新建需求")');
    await page.waitForTimeout(500);
    
    // Fill requirement form
    await page.waitForSelector('input[name="title"]', { timeout: 5000 });
    await page.fill('input[name="title"]', 'Login Feature');
    await page.fill('textarea[name="description"]', 'User should be able to login with email and password');
    
    // Select type
    await page.click('[role="combobox"]:has-text("类型")');
    await page.waitForTimeout(200);
    await page.click('[role="option"]:has-text("Feature")');
    
    // Select priority
    await page.fill('input[name="priority"]', '8');
    
    // Submit
    await page.click('button:has-text("创建")');
    await page.waitForTimeout(2000);
    
    // Verify requirement was added
    const hasReq = await page.locator('text=Login Feature').first().isVisible();
    if (!hasReq) {
      throw new Error('Requirement was not added');
    }
    console.log('   ✅ Requirement "Login Feature" added\n');
    
    await page.screenshot({ path: 'output/e2e-04-requirement-added.png' });

    // Add another requirement
    console.log('   Adding second requirement...');
    await page.click('button:has-text("新建需求")');
    await page.waitForTimeout(500);
    
    await page.fill('input[name="title"]', 'Dashboard Bug Fix');
    await page.fill('textarea[name="description"]', 'Fix the layout issue on mobile devices');
    
    await page.click('[role="combobox"]:has-text("类型")');
    await page.waitForTimeout(200);
    await page.click('[role="option"]:has-text("Bug")');
    
    await page.fill('input[name="priority"]', '9');
    
    await page.click('button:has-text("创建")');
    await page.waitForTimeout(2000);
    
    const hasReq2 = await page.locator('text=Dashboard Bug Fix').first().isVisible();
    if (!hasReq2) {
      throw new Error('Second requirement was not added');
    }
    console.log('   ✅ Requirement "Dashboard Bug Fix" added\n');
    
    await page.screenshot({ path: 'output/e2e-05-all-requirements.png' });

    // ==================== TEST COMPLETE ====================
    console.log('✅ E2E FULL FLOW TEST PASSED!\n');
    console.log('Summary:');
    console.log('  ✅ User login successful');
    console.log('  ✅ Project "test" created');
    console.log('  ✅ Version view "v1.0" created');
    console.log('  ✅ 2 requirements added');
    console.log('\nScreenshots:');
    console.log('  - e2e-01-dashboard.png');
    console.log('  - e2e-02-project-created.png');
    console.log('  - e2e-03-version-view-created.png');
    console.log('  - e2e-04-requirement-added.png');
    console.log('  - e2e-05-all-requirements.png');

  } catch (error) {
    console.error('\n❌ TEST FAILED:\n');
    console.error(error.message);
    
    try {
      await page.screenshot({ path: 'output/e2e-error.png' });
      console.log('\n📸 Error screenshot: output/e2e-error.png');
    } catch {}
    
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2ETest();
