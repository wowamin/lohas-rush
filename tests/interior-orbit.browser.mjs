import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { CENTER_INTERIORS, interiorHref } from '../src/features/dahe/centers.ts';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5227/';
const folder = '.test-artifacts/interior-orbit'; await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { passed: false, errors: [], centers: [], desktop: false, touch: false };
const delta = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const read = page => page.evaluate(async () => {
  const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
  const state = _roots.get(document.querySelector('canvas'))?.store.getState();
  const player = state?.scene.getObjectByName('dahe-walker');
  if (!player?.children.length) return null;
  const position = state.camera.position.toArray(), pose = player.position.toArray();
  return { position, pose, yaw: Math.atan2(position[0] - pose[0], position[2] - pose[2]), radius: Math.hypot(position[0] - pose[0], position[1] - 1.15, position[2] - pose[2]) };
});
async function settle(page) {
  let previous = (await read(page)).position, stable = 0;
  await expect.poll(async () => {
    const current = (await read(page)).position;
    stable = delta(previous, current) < .003 ? stable + 1 : 0; previous = current; return stable;
  }, { timeout: 15000, intervals: [100, 200, 300] }).toBeGreaterThanOrEqual(3);
}
async function ready(page, center) {
  await page.goto(new URL(interiorHref(center, './'), base).href);
  await expect(page.locator('.dahe-preview')).toHaveAttribute('data-center-id', center.id);
  await expect.poll(() => read(page)).not.toBeNull(); await settle(page);
}
async function point(page) {
  return page.locator('canvas').evaluate(canvas => {
    for (const x of [innerWidth * .4, innerWidth * .6, innerWidth * .7]) for (const y of [innerHeight * .72, innerHeight * .6, innerHeight * .45]) if (document.elementFromPoint(x, y) === canvas) return { x, y };
    throw new Error('No unobstructed canvas point');
  });
}
async function drag(page, dx, dy = 0, button = 'left') {
  const p = await point(page);
  await page.mouse.move(p.x, p.y); await page.mouse.down({ button });
  await page.mouse.move(p.x + dx, p.y + dy, { steps: 12 }); await page.mouse.up({ button }); await settle(page);
}
async function reset(page) { await page.getByRole('button', { name: '重設視角', exact: true }).click(); await settle(page); }
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); page.on('pageerror', e => report.errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('lohas-rush:journey', 'city-sentinel'); localStorage.setItem('lohas-rush:exploration', 'journal-sentinel'); });
  for (const center of CENTER_INTERIORS) {
    await ready(page, center); const initial = await read(page);
    await drag(page, 200);
    assert(delta((await read(page)).position, initial.position) > 1); assert.deepEqual((await read(page)).pose, initial.pose);
    await page.screenshot({ path: `${folder}/${center.id}-orbit.png` });
    await reset(page); assert(delta((await read(page)).position, initial.position) < .04);
    report.centers.push(center.id);
  }
  await ready(page, CENTER_INTERIORS[0]); const initial = await read(page);
  for (let i = 1; i <= 4; i++) {
    await drag(page, Math.PI / 2 / .005, 0, 'right');
    const current = await read(page), expected = -i * Math.PI / 2;
    assert(Math.abs(Math.atan2(Math.sin(current.yaw - expected), Math.cos(current.yaw - expected))) < .035, 'right drag covers 360 degrees');
    assert.deepEqual(current.pose, initial.pose);
  }
  await reset(page); await drag(page, Math.PI / 2 / .005);
  const facing = await read(page);
  await page.keyboard.down('w'); await page.waitForTimeout(450); await page.keyboard.up('w'); await settle(page);
  const moved = await read(page);
  assert(moved.pose[0] > facing.pose[0] + .3, 'forward follows the rotated camera');
  assert(Math.abs(moved.yaw - facing.yaw) < .035, 'grandma turning does not spin the selected view');
  await page.keyboard.press('r'); await settle(page);
  let p = await point(page); await page.mouse.move(p.x, p.y); await page.mouse.wheel(0, -10000); await settle(page);
  assert(Math.abs((await read(page)).radius - 4) < .04);
  await page.mouse.wheel(0, 10000); await settle(page); assert(Math.abs((await read(page)).radius - 14) < .04);
  await reset(page); await drag(page, 0, 220); let high = await read(page);
  assert(high.position[1] > initial.position[1] && high.position.every(Number.isFinite));
  const held = await read(page); await page.mouse.move(1000, 500); await settle(page); assert(delta((await read(page)).position, held.position) < .04);
  // Cancel a live drag on blur, then verify that continued mouse movement is inert.
  p = await point(page); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 100, p.y, { steps: 5 });
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await settle(page);
  await expect(page.locator('canvas.is-orbiting')).toHaveCount(0); const blurred = await read(page);
  await page.mouse.move(p.x + 220, p.y); await page.mouse.up(); await settle(page); assert(delta((await read(page)).position, blurred.position) < .04);
  await reset(page); await page.getByRole('button', { name: '看看這裡', exact: false }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); const modal = await read(page);
  await page.locator('canvas').dispatchEvent('wheel', { deltaY: -500, cancelable: true }); await settle(page);
  assert(delta((await read(page)).position, modal.position) < .04);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: '俯瞰空間', exact: true }).click(); await settle(page);
  const overview = await read(page); await drag(page, 200); assert(delta((await read(page)).position, overview.position) < .04);
  await page.getByRole('button', { name: '繼續探索', exact: true }).click(); await settle(page); assert(delta((await read(page)).position, initial.position) < .04);
  assert.deepEqual(await page.evaluate(() => [localStorage.getItem('lohas-rush:journey'), localStorage.getItem('lohas-rush:exploration')]), ['city-sentinel', 'journal-sentinel']);
  report.desktop = true; console.log('PASS: five centers, left/right 360 orbit, view-relative movement, zoom limits, pitch, reset, blur and mode locks.');
  await page.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobile = await context.newPage(); mobile.on('pageerror', e => report.errors.push(e.message)); await ready(mobile, CENTER_INTERIORS[1]);
  const cdp = await context.newCDPSession(mobile), touch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  const start = await read(mobile);
  await touch('touchStart', [{ id: 1, x: 290, y: 400 }]);
  await touch('touchMove', [{ id: 1, x: 130, y: 430 }]); await touch('touchEnd', []); await settle(mobile);
  assert(delta((await read(mobile)).position, start.position) > 1); assert.deepEqual((await read(mobile)).pose, start.pose);
  await reset(mobile);
  await touch('touchStart', [{ id: 1, x: 120, y: 400 }, { id: 2, x: 260, y: 400 }]);
  await touch('touchMove', [{ id: 1, x: 80, y: 400 }, { id: 2, x: 300, y: 400 }]); await settle(mobile);
  assert((await read(mobile)).radius < start.radius - 1, 'pinching out zooms in');
  await touch('touchMove', [{ id: 1, x: 145, y: 400 }, { id: 2, x: 235, y: 400 }]); await touch('touchEnd', []); await settle(mobile);
  assert((await read(mobile)).radius > start.radius + 1, 'pinching in zooms out');
  await reset(mobile);
  const pad = await mobile.getByRole('button', { name: '向前', exact: true }).boundingBox();
  const padPoint = { id: 1, x: pad.x + pad.width / 2, y: pad.y + pad.height / 2 };
  await touch('touchStart', [padPoint, { id: 2, x: 290, y: 400 }]);
  await touch('touchMove', [padPoint, { id: 2, x: 260, y: 400 }]); await mobile.waitForTimeout(400); await touch('touchEnd', []); await settle(mobile);
  assert(delta((await read(mobile)).pose, start.pose) > .3, 'movement pad and scene drag work together');
  await mobile.screenshot({ path: `${folder}/mobile-orbit.png` });
  await touch('touchStart', [{ id: 1, x: 290, y: 400 }]); await touch('touchMove', [{ id: 1, x: 200, y: 400 }]);
  await mobile.setViewportSize({ width: 844, height: 390 }); await touch('touchEnd', []); await settle(mobile);
  await expect(mobile.locator('canvas.is-orbiting')).toHaveCount(0);
  const stopped = await read(mobile); await mobile.waitForTimeout(400); assert(delta((await read(mobile)).position, stopped.position) < .04);
  await mobile.screenshot({ path: `${folder}/mobile-landscape.png` });
  report.touch = true; assert.deepEqual(report.errors, []); report.passed = true;
  console.log('PASS: single-finger orbit, two-finger zoom, independent movement pad and resize cancellation.');
  await context.close();
} finally { await writeFile(`${folder}/validation.json`, JSON.stringify(report, null, 2)); await browser.close(); }
