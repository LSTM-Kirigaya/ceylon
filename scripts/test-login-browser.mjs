import { chromium } from 'playwright';

console.log('Testing browser login...\n');

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

// Enable console logging
page.on('console', msg => console.log('Browser console:', msg.text()));
page.on('pageerror', err => console.log('Page error:', err.message));

try {
  console.log('1. Navigating to login page...');
  await page.goto('http://localhost:3000/login', { timeout: 10000 });
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  console.log('   ✅ Login page loaded\n');

  console.log('2. Filling credentials...');
  await page.fill('input[name="email"]', 'demo@ceylonm.test');
  await page.fill('input[name="password"]', 'Demo123456!');
  console.log('   ✅ Form filled\n');

  console.log('3. Clicking login button...');
  await page.click('button[type="submit"]');
  
  // Wait for navigation or error
  console.log('4. Waiting for response...');
  await page.waitForTimeout(5000);
  
  const url = page.url();
  console.log(`   Current URL: ${url}\n`);
  
  // Check for error message
  const errorAlert = await page.locator('[role="alert"]').first();
  if (await errorAlert.isVisible().catch(() => false)) {
    const errorText = await errorAlert.textContent();
    console.log(`   ❌ Error: ${errorText}\n`);
  }
  
  // Check localStorage
  const localStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      items[key] = localStorage.getItem(key);
    }
    return items;
  });
  
  console.log('5. LocalStorage check:');
  const hasToken = Object.keys(localStorage).some(k => k.includes('sb-'));
  console.log(`   Token stored: ${hasToken ? '✅' : '❌'}\n`);
  
  await page.screenshot({ path: 'output/login-test-result.png' });
  console.log('6. Screenshot saved to output/login-test-result.png\n');
  
  if (url.includes('/dashboard')) {
    console.log('✅ LOGIN SUCCESSFUL!');
  } else {
    console.log('⚠️ Not redirected to dashboard');
  }

} catch (error) {
  console.error('❌ Test failed:', error.message);
  await page.screenshot({ path: 'output/login-test-error.png' });
} finally {
  console.log('\nClosing browser in 5 seconds...');
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
}
