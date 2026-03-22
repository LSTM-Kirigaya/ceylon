#!/usr/bin/env node
/**
 * Debug E2E Test
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const TEST_EMAIL = 'debug_e2e@ceylon.test';
const TEST_PASSWORD = 'Test123456!';

console.log('🧪 Debug E2E Test\n');

async function test() {
  // Create user first
  console.log('Creating test user...');
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  
  if (createError && !createError.message.includes('already been registered')) {
    console.error('Create user error:', createError);
  } else {
    console.log('✅ User ready\n');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('STEP 1: Navigate to login');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'output/debug-01-login-page.png' });
    console.log('   Screenshot: debug-01-login-page.png');

    console.log('\nSTEP 2: Fill form');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.screenshot({ path: 'output/debug-02-form-filled.png' });
    console.log('   Screenshot: debug-02-form-filled.png');

    console.log('\nSTEP 3: Click submit');
    
    // Listen for console messages
    page.on('console', msg => console.log('   Console:', msg.text()));
    page.on('pageerror', err => console.log('   Page error:', err.message));
    
    await page.click('button[type="submit"]');
    
    console.log('   Waiting 5 seconds...');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'output/debug-03-after-submit.png' });
    console.log('   Screenshot: debug-03-after-submit.png');
    
    const url = page.url();
    console.log(`\n   Current URL: ${url}`);
    
    // Check for error messages
    const errorAlert = await page.locator('[role="alert"]').first();
    if (await errorAlert.isVisible().catch(() => false)) {
      const errorText = await errorAlert.textContent();
      console.log(`   Error message: ${errorText}`);
    }

    if (url.includes('/dashboard')) {
      console.log('   ✅ SUCCESS: Redirected to dashboard!');
    } else if (url.includes('/login')) {
      console.log('   ❌ FAILED: Still on login page');
    } else {
      console.log(`   ⚠️ UNEXPECTED: On ${url}`);
    }

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'output/debug-error.png' });
  } finally {
    await browser.close();
  }
}

test();
