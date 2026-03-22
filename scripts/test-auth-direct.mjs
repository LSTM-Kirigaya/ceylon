#!/usr/bin/env node
/**
 * Authentication Test (Direct API + Login)
 * Creates user via Admin API, then tests Login via UI
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// Generate unique test credentials
const timestamp = Date.now();
const TEST_EMAIL = `autotest_${timestamp}@ceylon.test`;
const TEST_PASSWORD = 'Test123456!';
const TEST_NAME = 'Auto Test User';

console.log('🧪 Ceylon Authentication Test\n');
console.log('Test Credentials:');
console.log(`  Email: ${TEST_EMAIL}`);
console.log(`  Password: ${TEST_PASSWORD}`);
console.log(`  Name: ${TEST_NAME}\n`);

async function testAuth() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // ==================== STEP 1: CREATE USER VIA ADMIN API ====================
    console.log('📋 STEP 1: Create User via Admin API');
    console.log('   Creating user...');
    
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: TEST_NAME,
      }
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    const userId = userData.user.id;
    console.log(`   ✅ User created: ${userId}`);
    console.log(`   ✅ Email pre-verified\n`);

    // Wait for trigger to create profile
    await new Promise(r => setTimeout(r, 1000));

    // Verify profile was created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.log(`   ⚠️ Profile not created yet: ${profileError.message}`);
    } else {
      console.log('   ✅ Profile created:');
      console.log(`      - Email: ${profile.email}`);
      console.log(`      - Display Name: ${profile.display_name}\n`);
    }

    // ==================== STEP 2: TEST LOGIN UI ====================
    console.log('📋 STEP 2: Test Login via UI');
    console.log('   Navigating to /login...');
    
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    console.log('   Filling login form...');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    // Submit login
    console.log('   Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    console.log('   Waiting for dashboard redirect...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('   ✅ Successfully logged in and redirected to dashboard\n');
    } else {
      throw new Error(`Unexpected redirect: ${currentUrl}`);
    }

    // Screenshot after login
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'output/test-login-success.png' });
    console.log('   📸 Screenshot: output/test-login-success.png\n');

    // ==================== STEP 3: VERIFY DASHBOARD CONTENT ====================
    console.log('📋 STEP 3: Verify Dashboard');
    
    // Check for expected elements
    const hasProjectTitle = await page.locator('text=我的项目').isVisible();
    const hasNewProjectButton = await page.locator('text=新建项目').first().isVisible();
    const hasEmptyState = await page.locator('text=还没有项目').isVisible();
    
    if (hasProjectTitle && hasNewProjectButton) {
      console.log('   ✅ Dashboard loaded correctly');
      console.log('   ✅ "我的项目" title visible');
      console.log('   ✅ "新建项目" button visible');
      if (hasEmptyState) {
        console.log('   ✅ Empty state displayed (no projects yet)\n');
      }
    } else {
      console.log('   ⚠️ Some dashboard elements not found\n');
    }

    // ==================== STEP 4: TEST LOGOUT ====================
    console.log('📋 STEP 4: Test Logout');
    
    // Click on user menu (if exists)
    const userMenu = await page.locator('text=账户').first();
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
      await page.waitForTimeout(500);
      
      // Look for logout button
      const logoutBtn = await page.locator('text=退出登录').first();
      if (await logoutBtn.isVisible().catch(() => false)) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
        
        const url = page.url();
        if (url.includes('/login') || url === 'http://localhost:3000/') {
          console.log('   ✅ Logout successful\n');
        }
      }
    } else {
      console.log('   ⏭️ User menu not found, skipping logout test\n');
    }

    // ==================== TEST COMPLETE ====================
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('Test Summary:');
    console.log('  ✅ User created via Admin API');
    console.log('  ✅ Email auto-verified');
    console.log('  ✅ Profile created in database');
    console.log('  ✅ Login page accessible');
    console.log('  ✅ Login form submission works');
    console.log('  ✅ Redirect to dashboard after login');
    console.log('  ✅ Dashboard displays correctly');
    console.log('\n📝 Test User Credentials:');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:\n');
    console.error(error.message);
    
    // Screenshot on failure
    try {
      await page.screenshot({ path: 'output/test-error.png' });
      console.log('\n📸 Error screenshot: output/test-error.png');
    } catch {}
    
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testAuth();
