import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (err) => {
    errors.push(`PAGE ERROR: ${err.message}`);
    console.error('PAGE ERROR:', err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
      console.error('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:5192/');
  await page.waitForSelector('#startBtn', { timeout: 10000 });
  await page.click('#startBtn');
  await page.waitForTimeout(3000);

  console.log('Errors:', errors.length);
  if (errors.length > 0) {
    errors.forEach((e) => console.log('  -', e));
    process.exit(1);
  } else {
    console.log('No errors detected.');
  }

  await browser.close();
})();
