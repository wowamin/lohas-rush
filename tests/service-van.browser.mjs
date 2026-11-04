import assert from 'node:assert/strict';
import { expect } from '@playwright/test';

export async function testServiceVan(browser, baseURL) {
  for (const mode of ['ready', 'fallback']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    if (mode === 'fallback') await page.route('**/lohas_service_van.glb', route => route.abort());
    const loaded = mode === 'ready' ? page.waitForResponse(response => response.url().endsWith('/lohas_service_van.glb') && response.status() === 200) : undefined;
    await page.goto(baseURL); await page.locator('.map-vehicle').waitFor(); if (loaded) await loaded;
    // Read the existing R3F root for model assertions; never modify vehicle physics or task state.
    await page.waitForFunction(async expected => {
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const root = _roots.get(document.querySelector('canvas'));
      return root?.store.getState().scene.getObjectByName('service-van-model')?.userData.modelState === expected;
    }, mode);
    await page.waitForTimeout(300);
    const glass=await page.evaluate(async()=>{
      const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const pane=_roots.get(document.querySelector('canvas')).store.getState().scene.getObjectByName('van-windshield');
      return{opacity:pane.material.opacity,transparent:pane.material.transparent};
    });assert.deepEqual(glass,{opacity:.45,transparent:true});
    await page.bringToFront();
    await page.locator('canvas').click({ position: { x: 700, y: 450 } });
    await page.waitForFunction(() => document.visibilityState === 'visible' && document.hasFocus());
    const speed = async () => Number(await page.locator('.speed-panel strong').innerText());
    const pose = () => page.evaluate(async () => {
      const { useGame } = await import('/src/stores/game.ts');
      const { x, z, angle } = useGame.getState();
      return [x, z, -angle * 180 / Math.PI];
    });
    await page.keyboard.down('w'); await page.keyboard.down('a');
    await expect.poll(async () => Math.abs((await pose())[2]), { timeout: 10000 }).toBeGreaterThan(8);
    await page.keyboard.up('a'); await page.keyboard.up('w');
    const turned = await pose(); assert.ok(turned[0] < 0 && Math.abs(turned[2]) > 5, `${mode}: actual steering turns model`);
    await page.keyboard.press('r'); await page.waitForTimeout(300);
    await expect.poll(async () => { const p = await pose(); return Math.hypot(p[0], p[1] - 32); }).toBeLessThan(.001);
    await page.keyboard.down('w');
    await expect.poll(speed, { timeout: 10000 }).toBeGreaterThan(0);
    await expect.poll(speed, { timeout: 15000 }).toBe(0);
    await page.keyboard.up('w');
    const contact = await pose();
    assert.ok(contact[1] >= 8.45 && contact[1] < 10, `${mode}: collision stops van before fountain: ${contact}`);
    assert.equal(await speed(), 0);
    await page.keyboard.down('s');
    await expect.poll(async () => (await pose())[1] - contact[1], { timeout: 10000 }).toBeGreaterThan(2);
    await page.keyboard.up('s');
    assert.ok((await pose())[1] > contact[1] + 2, `${mode}: reverse escapes collision`);
    await page.keyboard.press('c'); await page.waitForTimeout(800);
    assert.equal(await page.locator('.camera-switch').innerText(), '鏡頭：高視角');
    await page.keyboard.press('r'); await page.waitForTimeout(400);
    assert.equal(await speed(), 0); const reset = await pose();
    assert.ok(Math.abs(reset[0]) < .001 && Math.abs(reset[1] - 32) < .001 && Math.abs(reset[2]) < .001);
    assert.equal(await page.locator('.camera-switch').innerText(), '鏡頭：跟車');
    await page.screenshot({ path: `.test-artifacts/service-van-${mode}.png` });
    {
      await page.evaluate(async () => {
        const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
        const THREE = await import('/node_modules/.vite/deps/three.js');
        const state = _roots.get(document.querySelector('canvas')).store.getState();
        const van = state.scene.getObjectByName('service-van-model').parent.clone(true);
        van.position.set(0,0,0);van.rotation.set(0,0,0);
        const scene = new THREE.Scene(); scene.background = new THREE.Color('#e6eee8'); scene.add(van);
        scene.add(new THREE.HemisphereLight('#fff8eb', '#819f91', 2.5));
        const light = new THREE.DirectionalLight('#ffffff', 3); light.position.set(4,7,-5); scene.add(light);
        const camera = new THREE.PerspectiveCamera(35, 1.5, .1, 100); camera.position.set(-4,2.8,-6); camera.lookAt(0,1.35,-.5);
        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(900,600);
        renderer.domElement.id = 'vehicle-review'; renderer.domElement.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;width:900px;height:600px';
        document.body.appendChild(renderer.domElement); renderer.render(scene,camera);
      });
      await page.locator('#vehicle-review').screenshot({ path: `.test-artifacts/cabin-${mode}.png` });
    }
    assert.deepEqual(errors, []); await page.close();
    console.log(`PASS: Service van ${mode}: steering, collision, reverse recovery, camera and reset.`);
  }
}
