import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { testModelAssets } from './assets.browser.mjs';
import { testHighSpeed } from './speed.browser.mjs';
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/';

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseURL);
  await page.locator('canvas').waitFor();
  await page.locator('.target-label').filter({ hasText: '大和' }).waitFor();
  assert.equal(await page.locator('.touch-controls').isVisible(), false, 'desktop keeps keyboard UI');
  const cameraSwitch = page.locator('.camera-switch');
  await expect(cameraSwitch).toHaveText('鏡頭：跟車');
  await page.waitForTimeout(400);
  const chaseShot = await page.screenshot({ clip: { x: 500, y: 300, width: 400, height: 400 } });
  await page.keyboard.press('c');
  await expect(cameraSwitch).toHaveText('鏡頭：高視角');
  await page.waitForTimeout(1500);
  const overviewShot = await page.screenshot({ clip: { x: 500, y: 300, width: 400, height: 400 } });
  assert.notDeepEqual(overviewShot, chaseShot, 'switch changes the actual central scene outside HUD');
  await cameraSwitch.click();
  await expect(cameraSwitch).toHaveText('鏡頭：跟車');
  await page.keyboard.press('c');
  await page.keyboard.press('r');
  await expect(cameraSwitch).toHaveText('鏡頭：跟車');
  await page.waitForTimeout(250);
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
  await testHighSpeed(page);
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
  await unsupported.goto(baseURL);
  await unsupported.getByRole('heading', { name: '暫時無法啟動 3D 城市' }).waitFor();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(baseURL);
  await mobile.locator('.target-label').filter({ hasText: '大和' }).waitFor();
  const mobileSpeed = () => mobile.locator('.speed-panel strong').innerText().then(Number);
  const cdp = await mobile.context().newCDPSession(mobile);
  await mobile.locator('.camera-switch').tap();
  await expect(mobile.locator('.camera-switch')).toHaveText('鏡頭：高視角');
  await mobile.getByRole('button', { name: '重新開始' }).tap();
  await expect(mobile.locator('.camera-switch')).toHaveText('鏡頭：跟車');
  await mobile.waitForTimeout(250);
  const point = async (label, id) => {
    const box = await mobile.getByRole('button', { name: label, exact: true }).boundingBox();
    assert.ok(box, `${label} is visible`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, id };
  };
  const gas = await point('油門', 1), left = await point('左轉', 2), brake = await point('煞車', 3);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [gas] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [gas, left] });
  await mobile.waitForTimeout(900);
  assert.ok(await mobileSpeed() > 0, 'touch throttle drives the vehicle');
  assert.equal(await mobile.locator('.touch-button[aria-pressed=true]').count(), 2, 'two fingers hold gas and steering');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [left] });
  await expect(mobile.getByRole('button', { name: '左轉', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(mobile.getByRole('button', { name: '油門', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [gas, brake] });
  await mobile.waitForTimeout(1000);
  assert.ok(await mobileSpeed() <= 5, 'touch brake slows vehicle even with gas held');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(mobile.locator('.touch-button[aria-pressed=true]')).toHaveCount(0);
  await mobile.waitForTimeout(2400);
  assert.ok(await mobileSpeed() <= 1, 'cancelled gas stays released');

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [gas] });
  await mobile.waitForTimeout(400);
  await mobile.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(mobile.locator('.touch-button[aria-pressed=true]')).toHaveCount(0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [gas] });
  await mobile.waitForTimeout(400);
  // Reset while the gas pointer is still down, then ensure it does not resume.
  await mobile.getByRole('button', { name: '重新開始' }).evaluate(button => button.click());
  await mobile.waitForTimeout(400);
  assert.equal(await mobileSpeed(), 0, 'reset clears held touch throttle');
  assert.equal(await mobile.locator('.touch-button[aria-pressed=true]').count(), 0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  const reverse = await point('倒車', 4);
  const positionZ = () => mobile.locator('.map-vehicle').getAttribute('transform').then(value => Number(value.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)[1]));
  const initialZ = await positionZ();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [reverse] });
  await mobile.waitForTimeout(900);
  assert.ok(await mobileSpeed() > 0, 'touch reverse moves the vehicle');
  assert.ok(await positionZ() > initialZ, 'reverse moves backward regardless of randomized destination');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [reverse, left] });
  await expect(mobile.locator('.touch-button[aria-pressed=true]')).toHaveCount(2);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(mobile.locator('.touch-button[aria-pressed=true]')).toHaveCount(0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [reverse] });
  await mobile.getByRole('button', { name: '重新開始' }).evaluate(button => button.click());
  await mobile.waitForTimeout(400);
  assert.equal(await mobileSpeed(), 0, 'reset clears held reverse');
  await expect(mobile.locator('.touch-button[aria-pressed=true]')).toHaveCount(0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  for (const [width, height, name] of [[390, 844, 'portrait'], [844, 390, 'landscape'], [320, 568, 'small']]) {
    await mobile.setViewportSize({ width, height });
    const bounds = await mobile.locator('.touch-button, .mission-panel, .speed-panel, .camera-switch').evaluateAll(elements =>
      elements.map(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
    for (const box of bounds) assert.ok(box.x >= 0 && box.y >= 0 && box.right <= width && box.bottom <= height, `${name} UI stays inside viewport`);
    const mission = await mobile.locator('.mission-panel').boundingBox();
    const controls = await mobile.locator('.touch-buttons').boundingBox();
    assert.ok(mission.y + mission.height < controls.y, `${name} mission does not cover controls`);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollHeight > innerHeight), false, `${name} has no vertical scroll`);
    await mobile.screenshot({ path: `.test-artifacts/city-mobile-${name}.png` });
  }
  assert.deepEqual(errors, [], 'no desktop or mobile runtime errors');
  console.log('PASS: Chrome WebGL scene, W/arrow/reverse/brake/reset/blur, context loss and unsupported fallback.');
  console.log('PASS: Mobile multi-touch throttle/reverse/steering/brake/cancel/blur/reset and portrait/landscape/small layouts.');
  console.log('PASS: Virtual camera C/button/touch switching, visible scene change and reset to chase.');
  console.log('Screenshot: .test-artifacts/city-desktop.png');
  await testModelAssets(browser, baseURL);
} finally { await browser.close(); }
