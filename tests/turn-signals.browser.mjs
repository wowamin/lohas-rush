import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const fallback of [false, true]) {
    const page = await browser.newPage({ viewport: fallback ? { width: 390, height: 844 } : { width: 1440, height: 960 }, hasTouch: fallback });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (fallback) await page.route('**/lohas_service_van.glb', route => route.abort());
    await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/');
    await page.waitForFunction(async expected => {
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      return _roots.get(document.querySelector('canvas'))?.store.getState().scene.getObjectByName('service-van-model')?.userData.modelState === expected;
    }, fallback ? 'fallback' : 'ready');
    await page.locator('canvas').click({ position: { x: fallback ? 180 : 700, y: 400 } });
    await page.waitForFunction(() => document.hasFocus() && document.visibilityState === 'visible');
    await expect(page.locator('.signal-controls')).toHaveCount(0);
    const lampStates = () => page.evaluate(async () => {
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const scene = _roots.get(document.querySelector('canvas')).store.getState().scene;
      return {
        signals: scene.getObjectByName('turn-signal-lights').children.filter(mesh => mesh.isMesh).map(mesh => mesh.material.emissiveIntensity > 0),
        brakes: scene.getObjectByName('brake-lights').children.map(mesh => mesh.material.emissiveIntensity > 0),
      };
    });
    const speed = () => page.locator('.speed-panel strong').innerText().then(Number);
    try {
      await expect.poll(lampStates).toEqual({ signals: Array(6).fill(false), brakes: [false, false] });
      await page.keyboard.down('w');
      await expect.poll(speed).toBeGreaterThan(5);
      await page.keyboard.down('a');
      await expect.poll(async () => (await lampStates()).signals.slice(0, 3).some(Boolean)).toBe(true);
      await expect.poll(async () => (await lampStates()).signals.slice(3).some(Boolean)).toBe(false);
      await page.keyboard.up('a');
      await expect.poll(lampStates).toEqual({ signals: Array(6).fill(false), brakes: [false, false] });

      await page.keyboard.down('d');
      await expect.poll(async () => (await lampStates()).signals.slice(3).some(Boolean)).toBe(true);
      await page.keyboard.up('d');
      await expect.poll(lampStates).toEqual({ signals: Array(6).fill(false), brakes: [false, false] });

      await page.keyboard.up('w');
      await page.keyboard.down('Space');
      await expect.poll(async () => (await lampStates()).brakes).toEqual([true, true]);
      await expect.poll(async () => (await lampStates()).brakes).toEqual([false, false]);
      await expect.poll(async () => (await lampStates()).brakes).toEqual([true, true]);
      await page.keyboard.down('s');
      await expect.poll(async () => (await lampStates()).brakes).toEqual([false, false]);
      await page.keyboard.up('Space');
      await expect.poll(speed).toBeGreaterThan(0);
      await expect.poll(async () => (await lampStates()).brakes).toEqual([true, true]);
      await expect.poll(async () => (await lampStates()).brakes).toEqual([false, false]);
      await page.keyboard.up('s');
      await page.keyboard.down('w');
      await page.keyboard.up('Space');
      await expect.poll(speed).toBeGreaterThan(5);
      await expect.poll(async () => (await lampStates()).brakes).toEqual([false, false]);
      await page.keyboard.up('w');
      await page.keyboard.press('r');
      await expect.poll(lampStates).toEqual({ signals: Array(6).fill(false), brakes: [false, false] });
      assert.deepEqual(errors, []);
      console.log(`PASS: ${fallback ? 'mobile fallback' : 'desktop GLB'} automatic turn signals and dual brake lights`);
    } finally {
      for (const key of ['w', 'a', 'd', 's', 'Space']) await page.keyboard.up(key);
      await page.close();
    }
  }
} finally { await browser.close(); }
