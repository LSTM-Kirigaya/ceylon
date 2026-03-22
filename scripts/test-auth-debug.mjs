#!/usr/bin/env node
/**
 * Debug Auth Test
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const timestamp = Date.now();
const TEST_EMAIL = `debug_${timestamp}@ceylon.test`;
const TEST_PASSWORD = 'Test123456!';
const TEST_NAME = 'Debug User';

console.log('🧪 Debug Auth Test\n');
console.log(`Email: ${TEST_EMAIL}`);
console.log(`Password: ${TEST_PASSWORD}\n`);

async function test() {
  const browser = await chromium.launch({ headless: false }); // 设置为 false 以便查看
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 1. 创建用户
    console.log('Creating user via API...');
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: TEST_NAME }
    });

    if (createError) throw createError;
    console.log(`✅ User created: ${userData.user.id}\n`);

    // 2. 访问登录页面
    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // 截图：初始状态
    await page.screenshot({ path: 'output/debug-01-initial.png' });
    console.log('📸 Screenshot: output/debug-01-initial.png');

    // 3. 填写表单
    console.log('Filling form...');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    await page.screenshot({ path: 'output/debug-02-filled.png' });
    console.log('📸 Screenshot: output/debug-02-filled.png');

    // 4. 点击登录
    console.log('Clicking login button...');
    await page.click('button[type="submit"]');
    
    // 5. 等待一下看结果
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'output/debug-03-after-submit.png' });
    console.log('📸 Screenshot: output/debug-03-after-submit.png');

    // 6. 检查当前 URL
    const currentUrl = page.url();
    console.log(`\nCurrent URL: ${currentUrl}`);

    // 7. 检查页面内容
    const pageContent = await page.content();
    if (pageContent.includes('错误') || pageContent.includes('error') || pageContent.includes('Invalid')) {
      console.log('⚠️ Error message detected on page');
      const errorText = await page.locator('[role="alert"]').textContent().catch(() => 'No alert found');
      console.log(`Error text: ${errorText}`);
    }

    // 8. 检查是否成功
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ SUCCESS: Redirected to dashboard!');
    } else if (currentUrl.includes('/login')) {
      console.log('❌ FAILED: Still on login page');
    } else {
      console.log(`⚠️ UNEXPECTED: On page ${currentUrl}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // 保持浏览器打开一会儿以便查看
    console.log('\nPress Ctrl+C to close...');
    await new Promise(r => setTimeout(r, 10000));
    await browser.close();
  }
}

test();
