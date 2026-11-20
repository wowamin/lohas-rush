import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dismissDrivingGuide, dismissOrientationNotice } from './browser-support.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5210/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
await mkdir('.test-artifacts/quality', { recursive: true });
const report = { passed: false, samples: [], errors: [] };
const inspect = page => page.evaluate(async () => {
  const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
  const { useVisual } = await import('/src/stores/visual.ts');
  const { useGame } = await import('/src/stores/game.ts');
  const root = _roots.get(document.querySelector('canvas')).store.getState(), visual = useVisual.getState(), game = useGame.getState();
  const batches = root.scene.getObjectByName('static-city-batches');
  const webp = [];
  root.scene.traverse(node => {
    for(const material of node.material ? (Array.isArray(node.material)?node.material:[node.material]) : [])
      for(const slot of ['map','normalMap','roughnessMap']){
        const map=material[slot];
        if(map?.image?.src?.endsWith('.webp'))webp.push({flipY:map.flipY,colorSpace:map.colorSpace,slot});
      }
  });
  return { quality: visual.quality, mode: visual.qualityMode, reason: visual.qualityReason,
    shadows: root.gl.shadowMap.enabled, shadowCalls: window.__LOHAS_RENDERING__?.shadowCalls, far: root.camera.far,
    dpr: root.gl.getPixelRatio(), buffer: [root.gl.domElement.width, root.gl.domElement.height],
    instances: batches.children.reduce((sum, mesh) => sum + mesh.count, 0), drawnInstances: batches.userData.renderedInstances,
    trees: root.scene.getObjectByName('street-vegetation')?.userData.visibleTrees,
    van: root.scene.getObjectByName('service-van-model')?.userData.modelState,
    headquarters: !!root.scene.getObjectByName('headquarters-reference'),
    scene: root.scene.uuid, mission: game.missionIndex, reset: game.resetKey, paused: game.controlsPaused,
    x: game.x, z: game.z, fps: window.__LOHAS_RENDERING__?.fps, webpMaps: webp.length,
    webpSamplingCorrect: webp.every(map=>!map.flipY&&map.colorSpace===(map.slot==='map'?'srgb':'')) };
});
const capabilities = (context, memory, cores) => context.addInitScript(({ memory, cores }) => {
  Object.defineProperty(Navigator.prototype, 'deviceMemory', { configurable: true, get: () => memory });
  Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { configurable: true, get: () => cores });
}, { memory, cores });
const slowCpu = (page, enabled) => page.evaluate(enabled => {
  window.__QUALITY_TEST_BUSY__ = enabled;
  if (enabled) requestAnimationFrame(function work() {
    if (!window.__QUALITY_TEST_BUSY__) return;
    const end = performance.now() + 55;
    while (performance.now() < end) { /* Deliberate test workload, not a fabricated FPS value. */ }
    requestAnimationFrame(work);
  });
}, enabled);

try {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await capabilities(mobile, 2, 8);
  let page = await mobile.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/assets/optimized/*.glb', async route => { await new Promise(resolve => setTimeout(resolve, 2500)); if (!page.isClosed()) await route.continue(); });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '略過引導', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: '遊戲載入進度' })).toBeVisible();
  const first = await inspect(page); assert.equal(first.paused, true);
  await page.screenshot({ path: '.test-artifacts/quality/loading-mobile.png' });
  await page.locator('main[data-loading-state=ready]').waitFor({ timeout: 30000 });
  await dismissOrientationNotice(page);
  await expect.poll(async () => (await inspect(page)).van).toBe('ready');
  await expect.poll(async () => (await inspect(page)).headquarters).toBe(true);
  const low = await inspect(page); report.samples.push({ device: '2 GB phone / 3x screen', ...low });
  assert.equal(low.mode, 'auto'); assert.equal(low.quality, 'low'); assert.equal(low.shadows, false); assert.equal(low.shadowCalls, 0);
  assert.equal(low.far, 230); assert(low.dpr <= 1.5); assert.equal(low.buffer[0], 390);
  assert.equal(page.workers().length,1,'low memory limits Draco to one worker even on an eight-core phone');
  await page.getByRole('button', { name: '畫面設定', exact: true }).click();
  await page.getByLabel('畫質', { exact: true }).selectOption('high');
  await expect.poll(async () => (await inspect(page)).shadowCalls, { timeout: 30000 }).toBeGreaterThan(0);
  const high = await inspect(page); report.samples.push({ device: 'same phone / manual high', ...high });
  assert.equal(high.scene, low.scene); assert.equal(high.mission, low.mission); assert.equal(high.reset, low.reset);
  assert.equal(high.mode, 'manual'); assert.equal(high.far, 640); assert(high.instances > low.instances); assert(high.trees >= low.trees);
  assert(high.webpMaps>0);assert.equal(high.webpSamplingCorrect,true,'WebP keeps DataTexture orientation and color/numeric map spaces');
  await slowCpu(page, true); await page.waitForTimeout(7000); await slowCpu(page, false);
  assert.equal((await inspect(page)).quality, 'high', 'manual override survives sustained low frame rate');
  await page.reload(); await dismissDrivingGuide(page);
  assert.equal((await inspect(page)).quality, 'high'); assert.equal((await inspect(page)).mode, 'manual');
  await page.getByRole('button', { name: '畫面設定', exact: true }).click();
  await page.getByLabel('畫質', { exact: true }).selectOption('auto');
  await expect.poll(async () => (await inspect(page)).quality).toBe('low');
  await page.reload(); await dismissDrivingGuide(page);
  assert.equal((await inspect(page)).mode, 'auto'); assert.equal((await inspect(page)).quality, 'low');
  await page.screenshot({ path: '.test-artifacts/quality/low-mobile.png' });
  await mobile.close();
  console.log('PASS: Actual loading progress/pause, 2 GB phone auto-low, DPR cap, zero shadows, fewer instances, Draco/WebP, manual override and auto/manual persistence.');

  const strong = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await capabilities(strong, 8, 8); page = await strong.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(base); await dismissDrivingGuide(page);
  assert.equal((await inspect(page)).quality, 'high');
  await slowCpu(page, true);
  await expect.poll(async () => (await inspect(page)).quality, { timeout: 35000 }).not.toBe('high');
  await slowCpu(page, false);
  const adapted = await inspect(page); report.samples.push({ device: '8 GB device / artificial CPU load', ...adapted });
  assert.equal(adapted.mode, 'auto'); assert.match(adapted.reason, /實測/);
  await strong.close();
  console.log('PASS: Strong device starts high; measured slow frames under real artificial CPU work automatically lower quality. This is a policy test, not a phone FPS benchmark.');

  const stalled = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await capabilities(stalled, 2, 4); page = await stalled.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  const pending = []; await page.route('**/assets/optimized/*.glb', route => { pending.push(route); });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '略過引導', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: '遊戲載入進度' })).toBeVisible();
  await page.locator('main[data-loading-state=ready]').waitFor({ timeout: 25000 });
  await dismissOrientationNotice(page);
  await expect(page.getByRole('status').filter({ hasText: '載入較慢' })).toBeVisible();
  assert.equal((await inspect(page)).van, 'fallback');
  await page.keyboard.down('w'); await expect.poll(() => page.locator('.speed-panel strong').innerText().then(Number)).toBeGreaterThan(5); await page.keyboard.up('w');
  await Promise.all(pending.map(route => route.abort().catch(() => {}))); await stalled.close();
  console.log('PASS: Stalled model downloads exit the startup overlay into a playable fallback rather than blocking the game indefinitely.');
  assert.deepEqual(report.errors, []); report.passed = true;
  await writeFile('.test-artifacts/quality/validation.json', JSON.stringify(report, null, 2));
} finally { await browser.close(); }
