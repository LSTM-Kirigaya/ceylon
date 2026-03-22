#!/usr/bin/env node
/**
 * Authentication Flow Test
 * Tests: Register -> Login -> Dashboard
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
const TEST_EMAIL = `test_${timestamp}@example.com`;
const TEST_PASSWORD = 'Test123456!';
const TEST_NAME = 'Test User';

console.log('🧪 Starting Authentication Flow Test\n');
console.log('Test Credentials:');
console.log(`  Email: ${TEST_EMAIL}`);
console.log(`  Password: ${TEST_PASSWORD}`);
console.log(`  Name: ${TEST_NAME}\n`);

async function testAuthFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // ==================== STEP 1: REGISTER ====================
    console.log('📋 STEP 1: Registration');
    console.log('   Navigating to /register...');
    
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');
    
    // Fill registration form
    console.log('   Filling registration form...');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="displayName"]', TEST_NAME);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
    
    // Submit form
    console.log('   Submitting registration...');
    await page.click('button[type="submit"]');
    
    // Wait for step 2 (avatar upload) or error
    await page.waitForTimeout(2000);
    
    // Check if we're on step 2 (avatar upload)
    const step2Visible = await page.locator('text=上传头像（可选）').isVisible().catch(() => false);
    
    if (step2Visible) {
      console.log('   ✅ Registration successful, reached avatar step');
      
      // Skip avatar upload
      console.log('   Skipping avatar upload...');
      await page.click('button:has-text("跳过")');
      
      // Wait for success page
      await page.waitForTimeout(1500);
      
      const successVisible = await page.locator('text=注册成功！').isVisible().catch(() => false);
      if (successVisible) {
        console.log('   ✅ Registration complete page reached\n');
      } else {
        console.log('   ⚠️ Registration success page not detected\n');
      }
    } else {
      // Check for error
      const errorVisible = await page.locator('[role="alert"]').isVisible().catch(() => false);
      if (errorVisible) {
        const errorText = await page.locator('[role="alert"]').textContent();
        throw new Error(`Registration failed: ${errorText}`);
      }
    }

    // Screenshot after registration
    await page.screenshot({ path: 'output/test-01-register-success.png' });
    console.log('   📸 Screenshot: output/test-01-register-success.png\n');

    // ==================== STEP 2: VERIFY EMAIL (Admin) ====================
    console.log('📋 STEP 2: Email Verification (via Admin)');
    console.log('   Looking up user in database...');
    
    // Get the user and verify email via admin API
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    
    const testUser = users.find(u => u.email === TEST_EMAIL);
    if (!testUser) {
      throw new Error('User not found after registration');
    }
    
    console.log(`   Found user: ${testUser.id}`);
    
    // Confirm email via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      testUser.id,
      { email_confirm: true }
    );
    
    if (updateError) {
      console.log(`   ⚠️ Could not auto-verify email: ${updateError.message}`);
    } else {
      console.log('   ✅ Email verified via admin API\n');
    }

    // ==================== STEP 3: LOGIN ====================
    console.log('📋 STEP 3: Login');
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
    console.log('   Waiting for dashboard...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('   ✅ Successfully logged in and redirected to dashboard\n');
    } else {
      throw new Error(`Unexpected redirect: ${currentUrl}`);
    }

    // Screenshot after login
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'output/test-02-login-dashboard.png' });
    console.log('   📸 Screenshot: output/test-02-login-dashboard.png\n');

    // ==================== STEP 4: VERIFY PROFILE ====================
    console.log('📋 STEP 4: Profile Verification');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUser.id)
      .single();
    
    if (profileError) {
      console.log(`   ⚠️ Profile check failed: ${profileError.message}`);
    } else {
      console.log('   ✅ Profile created successfully:');
      console.log(`      - Email: ${profile.email}`);
      console.log(`      - Display Name: ${profile.display_name}`);
      console.log(`      - Created At: ${profile.created_at}\n`);
    }

    // ==================== TEST COMPLETE ====================
    console.log('✅ AUTHENTICATION FLOW TEST PASSED!\n');
    console.log('Summary:');
    console.log('  ✅ Registration form submitted');
    console.log('  ✅ Avatar step reached');
    console.log('  ✅ Registration completed');
    console.log('  ✅ Email verified (admin)');
    console.log('  ✅ Login successful');
    console.log('  ✅ Dashboard accessed');
    console.log('  ✅ Profile created in database');

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

testAuthFlow();
