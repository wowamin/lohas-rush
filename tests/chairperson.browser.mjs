import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
await mkdir('.test-artifacts', { recursive: true });
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 }, hasTouch: mobile, isMobile: mobile });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/');
    await expect.poll(() => page.evaluate(async () => {
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      return !!_roots.get(document.querySelector('canvas'))?.store.getState().scene.getObjectByName('chairperson-character');
    })).toBe(true);
    const inspect = () => page.evaluate(async () => {
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const { Box3 } = await import('/node_modules/.vite/deps/three.js');
      const state = _roots.get(document.querySelector('canvas')).store.getState();
      const npc = state.scene.getObjectByName('headquarters-chairperson');
      const bounds = new Box3().setFromObject(npc);
      let count = 0;
      state.scene.traverse(node => { if (node.name === 'chairperson-character') count++; });
      return { position: npc.position.toArray(), min: bounds.min.toArray(), max: bounds.max.toArray(),
        greeting: npc.getObjectByName('chairperson-greeting').rotation.z, count };
    });
    const before = await inspect();
    assert.deepEqual(before.position, [-8.15, .31, 3.55]);
    assert.equal(before.count, 1, 'StrictMode leaves exactly one character');
    assert.ok(before.min[1] >= .31 && before.min[1] < .33, 'shoes rest on the entrance pavement');
    assert.ok(before.min[2] > 3.1 && before.max[2] < 4, 'character clears the facade and stays on pavement');
    await page.waitForTimeout(450);
    assert.notEqual((await inspect()).greeting, before.greeting, 'greeting animates');
    await page.keyboard.press('r');
    assert.deepEqual((await inspect()).position, before.position, 'reset preserves the NPC at headquarters');
    // Camera override for the inspection image only, after the game's camera update.
    await page.evaluate(async () => {
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const store = _roots.get(document.querySelector('canvas')).store;
      const state = store.getState();
      state.internal.subscribers.push({ store, ref: { current: () => {
        state.camera.position.set(-7, 2.8, 9.5);
        state.camera.lookAt(-9.1, 1.55, 3.5);
        state.camera.updateMatrixWorld();
      } }, priority: 0 });
    });
    await page.addStyleTag({ content: 'header, aside, footer, .drive-caption, .speed-panel, .touch-controls, .passenger-panel, .world-label, .route-map { display: none !important; }' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `.test-artifacts/chairperson-${mobile ? 'mobile' : 'desktop'}.png` });
    if (!mobile) {
      await page.evaluate(async () => {
        const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
        const store = _roots.get(document.querySelector('canvas')).store;
        const state = store.getState();
        state.internal.subscribers.push({ store, ref: { current: () => {
          state.camera.position.set(-7.55, 2, 6.6);
          state.camera.lookAt(-8.15, 1.3, 3.55);
          state.camera.updateMatrixWorld();
        } }, priority: 0 });
      });
      await page.waitForTimeout(250);
      await page.screenshot({ path: '.test-artifacts/chairperson-closeup.png' });
    }
    assert.deepEqual(errors, [], 'no runtime errors');
    await page.close();
  }
  console.log('PASS: desktop/mobile NPC placement, pavement clearance, single instance, greeting animation, reset and runtime.');
} finally { await browser.close(); }
