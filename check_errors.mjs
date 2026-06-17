import { chromium } from 'playwright';

const url = 'http://localhost:5174';
console.log('Launching browser to check errors at', url);

try {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error('[BROWSER UNCAUGHT ERROR]:', err.message, err.stack);
  });

  page.on('requestfailed', request => {
    console.log(`[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`);
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
  console.log('Page loaded. Waiting for any late errors...');
  await page.waitForTimeout(3000);

  await browser.close();
} catch (err) {
  console.error('Error running script:', err);
}
