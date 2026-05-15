import { chromium } from 'playwright';

const url = process.env.VERIFY_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });

const viewports = [
  { name: 'desktop', width: 1280, height: 800, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

const results = [];

for (const viewport of viewports) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/telefono-${viewport.name}.png`, fullPage: false });

  const result = await page.evaluate(() => {
    const canvas = document.querySelector('#experience');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const pixels = new Uint8Array(4);
    gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const phonePanel = document.querySelector('.phone-panel').getBoundingClientRect();
    const walkPad = document.querySelector('.walk-pad').getBoundingClientRect();
    const ui = {
      title: document.querySelector('#eventTitle')?.textContent,
      buttons: document.querySelectorAll('[data-scenario]').length,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      phonePanel: {
        left: phonePanel.left,
        right: phonePanel.right,
        top: phonePanel.top,
        bottom: phonePanel.bottom,
      },
      walkPad: {
        left: walkPad.left,
        right: walkPad.right,
        top: walkPad.top,
        bottom: walkPad.bottom,
      },
    };
    return { pixel: Array.from(pixels), ui };
  });
  results.push({ viewport: viewport.name, ...result });
  await page.close();
}

await browser.close();

const failed = results.some((result) => {
  const nonBlank = result.pixel.some((value) => value > 8);
  const panelInViewport = result.ui.phonePanel.left >= 0 && result.ui.phonePanel.right <= result.ui.canvasWidth && result.ui.phonePanel.bottom <= result.ui.canvasHeight;
  const padInViewport = result.ui.walkPad.left >= 0 && result.ui.walkPad.right <= result.ui.canvasWidth && result.ui.walkPad.bottom <= result.ui.canvasHeight;
  const padAvoidsPanel = result.ui.walkPad.bottom <= result.ui.phonePanel.top || result.ui.walkPad.right <= result.ui.phonePanel.left || result.ui.walkPad.left >= result.ui.phonePanel.right;
  return !nonBlank || result.ui.buttons < 6 || !panelInViewport || !padInViewport || !padAvoidsPanel;
});

if (failed) {
  console.error(JSON.stringify(results, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(results, null, 2));
