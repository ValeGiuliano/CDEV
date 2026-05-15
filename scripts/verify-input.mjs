import { chromium } from 'playwright';

const url = process.env.VERIFY_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => window.__experienceDebug.finishIntro());
await page.waitForTimeout(150);

const beforeMove = await page.evaluate(() => window.__experienceDebug.getState());
await page.locator('#experience').click({ position: { x: 640, y: 400 } });
for (let i = 0; i < 5; i += 1) {
  await page.keyboard.press('KeyW');
  await page.waitForTimeout(80);
}
const afterMove = await page.evaluate(() => window.__experienceDebug.getState());

await page.locator('[data-scenario="call"]').click();
await page.locator('[data-scenario="sms"]').click();
await page.locator('[data-scenario="bank"]').click();
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/telefono-risk-mobile.png', fullPage: false });

const result = await page.evaluate(() => ({
  title: document.querySelector('#eventTitle')?.textContent,
  risk: document.querySelector('#riskValue')?.textContent,
  screen: document.querySelector('#screenTitle')?.textContent,
  state: window.__experienceDebug.getState(),
  blur: getComputedStyle(document.documentElement).getPropertyValue('--vision-blur').trim(),
  phonePanel: document.querySelector('.phone-panel')?.getBoundingClientRect().toJSON(),
}));
result.movedDistance = Math.hypot(afterMove.camera.x - beforeMove.camera.x, afterMove.camera.z - beforeMove.camera.z);

await browser.close();

if (result.title !== 'Sobrecarga de pasos' || result.risk !== '83%' || result.movedDistance < 0.25 || result.state.visualStress < 0.45) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
