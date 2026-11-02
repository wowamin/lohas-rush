import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('canvas').waitFor();
  await page.getByText('1 · 抵達區', { exact: true }).waitFor();
  const speed = () => page.locator('.speed-panel strong').innerText().then(Number);
  await page.keyboard.down('w');
  await page.waitForTimeout(1300);
  assert.ok(await speed() > 0, 'forward input increases speed');
  await page.keyboard.up('w');
  await page.keyboard.down('Space');
  await page.waitForTimeout(1000);
  await page.keyboard.up('Space');
  assert.equal(await speed(), 0, 'Space stops vehicle');
  await page.keyboard.press('r');
  await page.waitForTimeout(200);
  assert.equal(await speed(), 0);
  await page.keyboard.down('s');
  await page.waitForTimeout(800);
  assert.ok(await speed() > 0, 'reverse input works');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(2600);
  assert.ok(await speed() <= 1, 'blur clears held throttle');
  await page.keyboard.up('s');
  await page.getByRole('button', { name: '重新開始' }).click();
  await page.waitForTimeout(200);
  assert.equal(await speed(), 0, 'button resets vehicle');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(800);
  assert.ok(await speed() > 0, 'arrow input works');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.press('r');
  await page.waitForTimeout(300);
  await mkdir('.test-artifacts', { recursive: true });
  await page.screenshot({ path: '.test-artifacts/city-desktop.png' });
  assert.deepEqual(errors, [], 'no runtime errors');
  await page.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await page.getByRole('heading', { name: '暫時無法啟動 3D 城市' }).waitFor();
  assert.equal(await page.locator('.mission-panel').count(), 0);

  const unsupported = await browser.newPage();
  await unsupported.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl2' || type === 'webgl' ? null : original.call(this, type, ...args);
    };
  });
  await unsupported.goto('http://127.0.0.1:5173/');
  await unsupported.getByRole('heading', { name: '暫時無法啟動 3D 城市' }).waitFor();
  console.log('PASS: Chrome WebGL scene, W/arrow/reverse/brake/reset/blur, context loss and unsupported fallback.');
  console.log('Screenshot: .test-artifacts/city-desktop.png');
} finally { await browser.close(); }
