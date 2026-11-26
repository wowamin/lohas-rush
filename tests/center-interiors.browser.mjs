import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { CENTER_INTERIORS, interiorHref } from '../src/features/dahe/centers.ts';
import { locations } from '../src/data/locations.ts';
import { newJourney, serializeJourney } from '../src/progress/persistence.ts';
import { dismissDrivingGuide } from './browser-support.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5227/';
const folder = '.test-artifacts/center-interiors';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { passed: false, errors: [], roundTrips: [], storageIsolation: false, arrival: 'restored legal campus saves, not a driving-route test' };
async function target(page, locator) {
  await expect(locator).toBeVisible();
  await expect.poll(() => locator.evaluate(node => {
    const r = node.getBoundingClientRect();
    return r.height >= 44 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  }), { timeout: 15000 }).toBe(true);
}
try {
  for (const mobile of [false, true]) for (const center of CENTER_INTERIORS) {
    const location = locations.find(item => item.id === center.id);
    const context = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
    const saved = serializeJourney({ ...newJourney(), missionIndex: 4, completed: true, vehicle: { x: location.arrival[0], z: location.arrival[1], angle: location.rotation } }, Date.now());
    await page.addInitScript(({ saved, centers }) => {
      if (!localStorage.getItem('lohas-rush:journey')) {
        localStorage.setItem('lohas-rush:journey', saved);
        localStorage.setItem('lohas-rush:exploration', JSON.stringify({ version: 1, entries: { daihe: { discoveredAt: 1000, completedAt: 2000 } } }));
        localStorage.setItem('lohas-rush-graphics-v1', 'low');
        centers.forEach((item, i) => localStorage.setItem(item.progressKey, JSON.stringify({ version: 1, completed: i })));
      }
    }, { saved, centers: CENTER_INTERIORS });
    await page.goto(base); await dismissDrivingGuide(page);
    const entrance = page.getByRole('link', { name: `進入${center.name}室內`, exact: true });
    await target(page, entrance);
    await expect(page.locator('.interior-entrance')).toHaveCount(1);
    assert.equal(new URL(await entrance.getAttribute('href'), page.url()).href, new URL(interiorHref(center, './'), base).href);
    await page.screenshot({ path: `${folder}/${center.id}-${mobile ? 'mobile' : 'desktop'}-entrance.png` });
    const journal = await page.evaluate(() => localStorage.getItem('lohas-rush:exploration'));
    if (mobile) await entrance.tap(); else { await entrance.focus(); await page.keyboard.press('Enter'); }
    await expect(page.locator('.dahe-preview')).toHaveAttribute('data-center-id', center.id);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(center.name);
    const progress = CENTER_INTERIORS.indexOf(center);
    await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', String(progress));
    if (center.id !== 'daihe') await expect(page.locator('.dahe-bottom')).toContainText('共用示意空間');
    const citySave = await page.evaluate(() => localStorage.getItem('lohas-rush:journey'));
    const exit = page.getByRole('link', { name: `從${center.name}室內返回戶外`, exact: true });
    await target(page, exit);
    // Reset one center through the real confirmation; no other center may change.
    await page.getByRole('button', { name: '重新參觀', exact: true }).click();
    await expect(exit).toHaveCount(0);
    await page.getByRole('button', { name: '重新開始參觀', exact: true }).click();
    await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '0');
    await page.getByRole('button', { name: '看看這裡', exact: false }).click();
    await page.getByRole('button', { name: '記下這個角落', exact: true }).click();
    await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '1');
    const stored = await page.evaluate(centers => centers.map(item => JSON.parse(localStorage.getItem(item.progressKey)).completed), CENTER_INTERIORS);
    assert.deepEqual(stored, CENTER_INTERIORS.map((item, i) => item.id === center.id ? 1 : i));
    assert.equal(await page.evaluate(() => localStorage.getItem('lohas-rush:journey')), citySave);
    await page.reload();
    await expect(page.locator('.dahe-preview')).toHaveAttribute('data-dahe-progress', '1');
    await target(page, exit); await page.waitForTimeout(1000);
    await page.screenshot({ path: `${folder}/${center.id}-${mobile ? 'mobile' : 'desktop'}-exit.png` });
    if (mobile) await exit.tap(); else { await exit.focus(); await page.keyboard.press('Enter'); }
    await dismissDrivingGuide(page); await target(page, entrance);
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('lohas-rush:journey')));
    assert.equal(restored.missionIndex, 4); assert.equal(restored.completed, true);
    assert(Math.hypot(restored.vehicle.x - location.arrival[0], restored.vehicle.z - location.arrival[1]) < .1);
    assert.equal(await page.evaluate(() => localStorage.getItem('lohas-rush:exploration')), journal);
    report.roundTrips.push({ center: center.id, device: mobile ? 'mobile-touch' : 'desktop-keyboard' });
    console.log(`PASS: ${center.id} ${mobile ? 'mobile' : 'desktop'} entry, isolated progress/reset/reload and exit to original campus.`);
    await context.close();
  }
  assert.deepEqual(report.errors, []); report.storageIsolation = true; report.passed = true;
} finally {
  await writeFile(`${folder}/validation.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
