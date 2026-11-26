import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, stat, mkdtemp } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { serializeJourney, newJourney } from '../src/progress/persistence.ts';
import { dismissDrivingGuide } from './browser-support.mjs';

const root = resolve('dist');
await stat(resolve(root, 'sw.js')); // Always test the production build, never a dev worker.
await mkdir('.test-artifacts/pwa', { recursive: true });
const mounts = ['/lohas-rush/', '/fail/', '/'];
let revision = 0, failInstall = true;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.wasm':'application/wasm', '.webp':'image/webp' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost'), mount = mounts.find(path => url.pathname.startsWith(path));
    const relative = decodeURIComponent(url.pathname.slice(mount.length)) || 'index.html';
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    if (mount === '/fail/' && failInstall && relative.endsWith('.hdr')) { response.writeHead(503).end('Interrupted download'); return; }
    let body = await readFile(file);
    if (relative === 'sw.js' && revision) body = Buffer.from(body.toString().replace(/const BUILD = "([^"]+)";/, 'const BUILD = "$1-update";'));
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
assert.equal((await fetch(origin)).status, 200);
const contexts = new Set();
const launchContext = async options => {
  // Chrome intentionally disallows installation in Playwright's incognito contexts.
  const profile = await mkdtemp(resolve('.test-artifacts/pwa/profile-'));
  const context = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...options });
  contexts.add(context); context.on('close', () => contexts.delete(context)); return context;
};
const snapshot = serializeJourney({ ...newJourney(), missionIndex: 2, vehicle: { x: 0, z: 40, angle: 0 } }, Date.now());
const seed = async context => context.addInitScript(({ snapshot }) => {
  if (!localStorage.getItem('lohas-rush:journey')) {
    localStorage.setItem('lohas-rush:journey', snapshot);
    localStorage.setItem('lohas-rush:exploration', JSON.stringify({ version: 1, entries: { daihe: { discoveredAt: 1000, completedAt: 2000 } } }));
    localStorage.setItem('lohas-rush-graphics-v1', 'low');
    localStorage.setItem('lohas-rush:driving-guide:v1', 'seen');
  }
}, { snapshot });
const readSave = page => page.evaluate(() => JSON.parse(localStorage.getItem('lohas-rush:journey')));
const openPanel = async page => { await page.getByRole('button', { name: /^(安裝／離線|離線中)$/ }).click(); await expect(page.getByRole('dialog', { name: '安裝與離線遊玩' })).toBeVisible(); };
const ready = page => expect(page.locator('[data-pwa-status]')).toHaveAttribute('data-pwa-status', 'ready', { timeout: 30000 });
const closePanel = page => page.getByRole('button', { name: '關閉安裝與離線' }).click();
const vehiclePose = page => page.locator('.map-vehicle').getAttribute('transform').then(value => value.match(/[-\d.]+/g).map(Number));

try {
  for (const [base, mobile] of [['/', false], ['/lohas-rush/', true]]) {
    const context = await launchContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 960 } });
    await seed(context);
    let page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + base);
    await dismissDrivingGuide(page);
    await expect(page.locator('.route-stop.visited')).toHaveCount(2);
    assert.deepEqual(await vehiclePose(page), [0, 40], 'physics starts at the saved vehicle position');
    await expect(page.locator('[data-exploration-marker=daihe]')).toHaveAttribute('data-exploration-status', 'completed');
    await openPanel(page); await ready(page);
    await expect(page.locator('[data-save-status]')).toHaveAttribute('data-save-status', 'saved');
    const initialCaches = await page.evaluate(() => caches.keys());
    assert.equal(initialCaches.filter(name => name.startsWith(`lohas-rush-offline:${origin + base}:`)).length, 1);
    const manifest = await page.evaluate(async () => {
      const url = new URL(document.querySelector('link[rel=manifest]').href);
      return { url: url.href, value: await fetch(url).then(response => response.json()) };
    });
    assert.equal(manifest.url, origin + base + 'manifest.webmanifest');
    assert.equal(manifest.value.display, 'fullscreen');
    assert.equal(new URL(manifest.value.start_url, manifest.url).href, origin + base);
    for (const size of [180, 192, 512]) {
      const data = await page.evaluate(async url => Array.from(new Uint8Array(await fetch(url).then(response => response.arrayBuffer()))), origin + base + `icons/icon-${size}.png`);
      assert.equal(Buffer.from(data).readUInt32BE(16), size);
    }
    const cdp = await context.newCDPSession(page);
    const appManifest = await cdp.send('Page.getAppManifest');
    assert.deepEqual(appManifest.errors, []);
    const installability = await cdp.send('Page.getInstallabilityErrors');
    assert.deepEqual(installability.installabilityErrors, [], JSON.stringify(installability));
    if (!mobile) {
      await page.getByRole('button', { name: '切換全螢幕' }).click();
      await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
      await page.getByRole('button', { name: '切換全螢幕' }).click();
      await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
    }
    await closePanel(page);

    // Actual input moves the restored car. Opening the panel flushes its current pose.
    if (mobile) {
      const gas = await page.locator('.touch-gas').boundingBox();
      await page.touchscreen.tap(gas.x + gas.width / 2, gas.y + gas.height / 2);
    }
    await page.keyboard.down('w'); await expect.poll(() => page.locator('.speed-panel strong').innerText().then(Number)).toBeGreaterThan(5);
    await page.keyboard.up('w'); await page.keyboard.down('Space');
    await expect.poll(() => page.locator('.speed-panel strong').innerText().then(Number)).toBe(0); await page.keyboard.up('Space');
    await openPanel(page);
    const saved = await readSave(page);
    assert.ok(saved.vehicle.z < 40, 'driving changed the saved vehicle position');
    const paused = await vehiclePose(page);
    await page.keyboard.down('w'); await page.waitForTimeout(250); await page.keyboard.up('w');
    assert.deepEqual(await vehiclePose(page), paused, 'installation panel pauses driving');
    await context.setOffline(true);
    await expect(page.getByRole('heading', { name: '目前離線' })).toBeVisible();
    await page.screenshot({ path: `.test-artifacts/pwa/offline-${mobile ? 'mobile' : 'desktop'}.png` });
    const resources = [];
    page.on('response', response => { if (response.fromServiceWorker()) resources.push(response.url()); });
    await page.reload();
    await page.locator('main[data-loading-state="ready"]').waitFor({timeout:30000});
    await dismissDrivingGuide(page);
    await expect(page.locator('.route-stop.visited')).toHaveCount(2);
    await expect(page.locator('.passenger-status strong')).toHaveText('兩位乘客在車內');
    await expect(page.locator('.speed-panel strong')).toHaveText('00');
    const restored = await vehiclePose(page);
    assert.ok(Math.abs(restored[0] - saved.vehicle.x) < .15 && Math.abs(restored[1] - saved.vehicle.z) < .15);
    await expect(page.locator('[data-exploration-marker=daihe]')).toHaveAttribute('data-exploration-status', 'completed');
    await expect.poll(() => resources.some(url => url.endsWith('.hdr'))).toBe(true);
    assert(resources.some(url => url.endsWith('lohas_service_van.glb')));
    assert(resources.some(url => url.endsWith('lohas_building_reference.glb')));
    assert(resources.some(url => url.endsWith('draco_decoder.wasm')));
    assert(resources.some(url => url.endsWith('.webp')));
    await page.getByRole('button', { name: '安裝／離線' }).or(page.getByRole('button', { name: '離線中', exact: true })).click();
    await ready(page); await closePanel(page);

    // A fresh game window must also launch with no network, not merely an existing tab.
    let fresh = await context.newPage();
    await fresh.goto(origin + base);
    await expect(fresh.locator('.route-stop.visited')).toHaveCount(2);
    await expect(fresh.locator('.speed-panel strong')).toHaveText('00');
    await fresh.close();
    // A new lazy preview must launch offline without mounting the city's save hooks.
    const citySaveBeforePreview = await readSave(page);
    const interior = await context.newPage();
    interior.on('pageerror', error => errors.push(error.message));
    await interior.goto(origin + base + '?scene=dahe');
    await expect(interior.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '0');
    await interior.getByRole('button', { name: '看看這裡', exact: false }).click();
    await expect(interior.getByRole('dialog')).toBeVisible();
    await interior.getByRole('button', { name: '記下這個角落', exact: true }).click();
    await expect(interior.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '1');
    await interior.reload();
    await expect(interior.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '1');
    assert.deepEqual(await readSave(interior), citySaveBeforePreview, 'preview reload must preserve the city save');
    await interior.close();
    await context.setOffline(false);
    if (!mobile) {
      const otherCache = `lohas-rush-offline:${origin}/other-game/:keep`;
      await page.evaluate(async name => { await caches.open(name); await caches.open('unrelated-app'); }, otherCache);
      revision = 1;
      await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); });
      await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting), { timeout: 30000 }).toBe(true);
      await openPanel(page); await expect(page.getByRole('dialog')).toContainText('新版已下載');
      const liveCaches = await page.evaluate(() => caches.keys());
      assert.equal(liveCaches.filter(name => name.startsWith(`lohas-rush-offline:${origin}/:`)).length, 2, 'active release remains cached while playing');
      let nextWorker;
      for(const worker of context.serviceWorkers()){
        try { if(await worker.evaluate(()=>BUILD.endsWith('-update')))nextWorker=worker; } catch { /* A retired worker may have closed. */ }
      }
      assert(nextWorker,'new release has an installed service worker');
      await page.close();
      // Keep all game clients closed until activation finishes; opening a new
      // client while an old dedicated worker is retiring can pin the old release.
      await expect.poll(()=>nextWorker.evaluate(()=>self.registration.waiting===null&&self.registration.active?.state==='activated'),{timeout:20000}).toBe(true);
      page = await context.newPage(); await page.goto(origin + base);
      await expect.poll(() => page.evaluate(async prefix => (await caches.keys()).filter(name => name.startsWith(prefix)), `lohas-rush-offline:${origin}/:`)).toHaveLength(1);
      const updated = await page.evaluate(() => caches.keys());
      assert(updated.some(name => name.endsWith('-update'))); assert(updated.includes(otherCache)); assert(updated.includes('unrelated-app'));
      await expect(page.locator('.route-stop.visited')).toHaveCount(2);
    }
    await page.getByRole('button', { name: /^重新開始旅程/ }).click();
    await expect.poll(async () => (await readSave(page)).missionIndex).toBe(0);
    await page.reload();
    await expect(page.locator('.route-stop.visited')).toHaveCount(0);
    await expect(page.locator('[data-exploration-marker=daihe]')).toHaveAttribute('data-exploration-status', 'completed');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS: ${base} manifest/installability, atomic precache, offline reload/new window, restored physics/journal, modal pause, persistent reset and independent offline Dahe preview${mobile ? '' : ', fullscreen, waiting update and scoped cache cleanup'}.`);
  }

  const failure = await launchContext(); await seed(failure);
  const page = await failure.newPage(); await page.goto(origin + '/fail/');
  await openPanel(page);
  await expect(page.locator('[data-pwa-status]')).toHaveAttribute('data-pwa-status', 'unavailable', { timeout: 30000 });
  assert.equal((await page.evaluate(() => caches.keys())).some(name => name.startsWith(`lohas-rush-offline:${origin}/fail/:`)), false);
  failInstall = false;
  await page.reload(); await openPanel(page); await ready(page);
  await failure.close();
  console.log('PASS: Interrupted precache never claims offline readiness or leaves a partial cache; a connected retry recovers.');
} finally { await Promise.all([...contexts].map(context => context.close())); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
