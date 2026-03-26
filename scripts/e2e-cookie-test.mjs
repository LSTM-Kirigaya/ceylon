#!/usr/bin/env node
/**
 * Test with explicit cookie handling
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTU0MDMsImV4cCI6MjA4OTc3MTQwM30.8fmv1ppusEdHEDvEnHGzKgf9g_zsTToyx832BL3yopo';

const TEST_EMAIL = 'cookie_test@ceylonm.test';
const TEST_PASSWORD = 'Test123456!';

console.log('🧪 Cookie Test\n');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Inject Supabase client and login via JavaScript
  console.log('Logging in via page.evaluate...');
  
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  // Execute login in browser context
  const loginResult = await page.evaluate(async ({ url, key, email, password }) => {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(url, key);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) return { error: error.message };
    return { 
      success: true, 
      user: data.user?.email,
      session: !!data.session
    };
  }, { url: SUPABASE_URL, key: ANON_KEY, email: TEST_EMAIL, password: TEST_PASSWORD });

  console.log('Login result:', loginResult);

  if (loginResult.success) {
    console.log('   ✅ Login successful in browser');
    
    // Wait and check cookies
    await page.waitForTimeout(2000);
    
    const cookies = await context.cookies();
    console.log('\n   Cookies after login:');
    cookies.forEach(c => console.log(`   - ${c.name}: ${c.value.substring(0, 50)}...`));
    
    // Navigate to dashboard
    console.log('\n   Navigating to dashboard...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log(`   Current URL: ${url}`);
    
    if (url.includes('/dashboard')) {
      console.log('   ✅ Successfully accessed dashboard!');
    } else {
      console.log('   ❌ Redirected away from dashboard');
    }
    
    await page.screenshot({ path: 'output/cookie-test-result.png' });
  }

  await browser.close();
}

// Create user first
const adminSupabase = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8', {
  auth: { persistSession: false }
});

adminSupabase.auth.admin.createUser({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  email_confirm: true
}).then(() => {
  console.log('User created');
  test();
}).catch(err => {
  if (err.message.includes('already')) {
    console.log('User exists');
    test();
  } else {
    console.error('Error:', err);
  }
});
