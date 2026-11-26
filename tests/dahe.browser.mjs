import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { PREVIEW_KEY } from '../src/features/dahe/interior.ts';

const base = new URL(process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/');
base.searchParams.set('scene', 'dahe');
const folder = '.test-artifacts/dahe';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [], report = { passed: false, errors, inputOnlyTour: [], mobileSizes: [], storageIsolation: false };
const attach = page => page.on('pageerror', error => errors.push(error.message));
const pose = page => page.locator('.dahe-preview').evaluate(node => ({ x: +node.dataset.playerX, z: +node.dataset.playerZ }));
async function ready(page) {
  await expect(page.locator('.dahe-preview')).toBeVisible();
  // The furniture effect and initial WebGL frame complete after DOM controls.
  await expect.poll(async () => {
    const width = page.viewportSize().width, height = page.viewportSize().height;
    const frame = await page.screenshot({ clip: { x: Math.round(width * .3), y: Math.round(height * .38), width: Math.round(width * .4), height: Math.round(height * .3) } });
    const stats = await sharp(frame).stats(); return Math.max(...stats.channels.map(channel => channel.stdev));
  }, { timeout: 30000 }).toBeGreaterThan(8);
}
async function walk(page, x, z) {
  for (const [axis, goal] of [['x', x], ['z', z]]) {
    const until = Date.now() + 18000;
    while (Date.now() < until) {
      const delta = goal - (await pose(page))[axis];
      if (Math.abs(delta) < .075) break;
      const key = axis === 'x' ? delta > 0 ? 'd' : 'a' : delta > 0 ? 's' : 'w';
      await page.keyboard.down(key);
      await page.waitForTimeout(Math.min(450, Math.max(20, Math.abs(delta) * 320)));
      await page.keyboard.up(key);
      // Read the final released pose, rather than steering against 10 Hz HUD lag.
      await page.waitForTimeout(80);
    }
    assert(Math.abs((await pose(page))[axis] - goal) < .09, `could not walk to ${axis}=${goal}: ${JSON.stringify(await pose(page))}`);
  }
}
async function finish(page, id, progress) {
  await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-near', id);
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toBeVisible();
  const before = await pose(page);
  await page.keyboard.down('w'); await page.waitForTimeout(220); await page.keyboard.up('w');
  assert.deepEqual(await pose(page), before, 'interaction pauses walking');
  await page.getByRole('button', { name: '記下這個角落', exact: true }).click();
  await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', String(progress));
  await page.keyboard.press('e');
  await expect(page.getByRole('button', { name: '記下這個角落', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  report.inputOnlyTour.push(id);
  console.log(`PASS: walked to and completed ${id}; interaction pauses and repeat completion is blocked.`);
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); attach(page);
  await page.addInitScript(() => {
    // Opaque sentinel data must never be touched by the independent scene.
    if (!localStorage.getItem('lohas-rush:journey')) localStorage.setItem('lohas-rush:journey', 'city-save-sentinel');
    if (!localStorage.getItem('lohas-rush:exploration')) localStorage.setItem('lohas-rush:exploration', 'journal-save-sentinel');
  });
  await page.goto(base.href); await ready(page);
  await page.screenshot({ path: `${folder}/walking-desktop.png` });
  await page.getByRole('button', { name: '俯瞰空間', exact: true }).click();
  await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-mode', 'overview');
  const frozen = await pose(page);
  await page.keyboard.down('w'); await page.waitForTimeout(400); await page.keyboard.up('w');
  assert.deepEqual(await pose(page), frozen);
  await page.waitForTimeout(1500); await page.screenshot({ path: `${folder}/overview-desktop.png` });
  await page.getByRole('button', { name: '繼續探索', exact: true }).click();
  // Visit a later zone first; it cannot advance the sequence.
  await walk(page, 0, 0); await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toContainText('先去迎賓接待');
  await expect(page.getByRole('button', { name: '記下這個角落', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape'); await page.keyboard.press('r');
  await expect.poll(() => pose(page)).toEqual({ x: 0, z: 5.7 });
  await finish(page, 'reception', 1);
  await page.reload(); await ready(page);
  await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '1');
  await walk(page, 0, 0); await finish(page, 'activity', 2);
  await walk(page, 0, -2.8); await walk(page, 7.2, -2.8); await walk(page, 7.2, -1.3); await finish(page, 'rest', 3);
  await walk(page, 7.2, -2.8); await walk(page, -5.8, -2.8); await walk(page, -5.8, -3.7); await finish(page, 'kitchen', 4);
  await walk(page, -4.9, -3.7); await walk(page, -4.9, 2.5); await walk(page, -7.4, 2.5); await finish(page, 'rehab', 5);
  await page.keyboard.press('r'); await expect.poll(() => pose(page)).toEqual({ x: 0, z: 5.7 });
  await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '5');
  // The back wall stops sustained input; releasing on blur cannot leave movement stuck.
  await page.keyboard.down('w'); await expect.poll(async () => (await pose(page)).z, { timeout: 12000 }).toBeLessThan(-6.4);
  await page.waitForTimeout(300); const wall = await pose(page); assert(wall.z >= -6.46);
  await page.keyboard.up('w'); await page.keyboard.press('r');
  await expect.poll(() => pose(page)).toEqual({ x: 0, z: 5.7 });
  await page.keyboard.down('w'); await expect.poll(async () => (await pose(page)).z).toBeLessThan(5.3);
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.waitForTimeout(160);
  const blurred = await pose(page); await page.waitForTimeout(300); assert.deepEqual(await pose(page), blurred); await page.keyboard.up('w');
  await page.getByRole('button', { name: '重新參觀', exact: true }).click(); await page.keyboard.press('Escape');
  await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '5');
  await page.getByRole('button', { name: '重新參觀', exact: true }).click();
  await page.getByRole('button', { name: '重新開始參觀', exact: true }).click();
  await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '0');
  assert.deepEqual(await page.evaluate(() => [localStorage.getItem('lohas-rush:journey'), localStorage.getItem('lohas-rush:exploration')]), ['city-save-sentinel', 'journal-save-sentinel']);
  report.storageIsolation = true;
  await context.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const touchPage = await mobile.newPage(); attach(touchPage); await touchPage.goto(base.href); await ready(touchPage);
  const cdp = await mobile.newCDPSession(touchPage);
  const up = await touchPage.getByRole('button', { name: '向前', exact: true }).boundingBox();
  const left = await touchPage.getByRole('button', { name: '向左', exact: true }).boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: up.x + up.width / 2, y: up.y + up.height / 2 }, { id: 2, x: left.x + left.width / 2, y: left.y + left.height / 2 }] });
  await expect.poll(async () => (await pose(touchPage)).x).toBeLessThan(-.3);
  assert((await pose(touchPage)).z < 5.4);
  await touchPage.setViewportSize({ width: 844, height: 390 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touchPage.waitForTimeout(180); const rotated = await pose(touchPage);
  await touchPage.waitForTimeout(250); assert.deepEqual(await pose(touchPage), rotated);
  for (const [width, height] of [[390, 844], [320, 568], [844, 390], [568, 320]]) {
    await touchPage.setViewportSize({ width, height });
    assert.equal(await touchPage.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight), false);
    const regions = [];
    for (const selector of ['.dahe-topbar', '.dahe-journey', '.dahe-map', '.dahe-pad', '.dahe-interaction']) {
      const rect = await touchPage.locator(selector).boundingBox();
      assert(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width + 1 && rect.y + rect.height <= height + 1, `${selector} outside ${width}x${height}`);
      regions.push({ selector, ...rect });
    }
    const overlaps = (a, b) => a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1;
    for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) assert(!overlaps(regions[i], regions[j]), `${regions[i].selector} overlaps ${regions[j].selector} at ${width}x${height}`);
    await touchPage.screenshot({ path: `${folder}/mobile-${width}x${height}.png` }); report.mobileSizes.push([width, height]);
  }
  await mobile.close();

  for (const variant of ['unavailable', 'quota', 'future', 'corrupt']) {
    const context = await browser.newContext(); const page = await context.newPage(); attach(page);
    await page.addInitScript(({ variant, key }) => {
      if (variant === 'future') localStorage.setItem(key, '{"version":2,"completed":4}');
      if (variant === 'corrupt') localStorage.setItem(key, 'bad');
      if (variant === 'unavailable') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
      if (variant === 'quota') Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    }, { variant, key: PREVIEW_KEY });
    await page.goto(base.href); await ready(page);
    await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '0');
    if (variant !== 'corrupt') await expect(page.getByRole('status')).toBeVisible();
    if (variant === 'future') assert.equal(await page.evaluate(key => localStorage.getItem(key), PREVIEW_KEY), '{"version":2,"completed":4}');
    await context.close();
  }
  assert.deepEqual(errors, []); report.passed = true;
  console.log('PASS: real-input five-zone tour, ordered/repeat-safe interactions, independent save/reset, walls, blur, overview, mobile multi-touch/rotation/layout and storage failures.');
} finally { await writeFile(`${folder}/validation.json`, JSON.stringify(report, null, 2)); await browser.close(); }
