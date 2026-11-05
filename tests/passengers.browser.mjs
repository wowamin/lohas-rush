import {dismissDrivingGuide} from './browser-support.mjs';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
await mkdir('.test-artifacts',{recursive:true});
try {
  for (const fallback of [false,true]) {
    const page = await browser.newPage(fallback ? {viewport:{width:390,height:844},isMobile:true,hasTouch:true} : {viewport:{width:1280,height:800}});
    const errors = []; page.on('pageerror',error=>errors.push(error.message));
    if (fallback) await page.route('**/lohas_service_van.glb',route=>route.abort());
    await page.goto(baseURL); await dismissDrivingGuide(page); await page.locator('.passenger-panel').waitFor();
    await page.bringToFront();
    const sceneState = async () => page.evaluate(async () => {
      const {_roots} = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const scene = _roots.get(document.querySelector('canvas'))?.store.getState().scene;
      const model = scene?.getObjectByName('service-van-model'), a=scene?.getObjectByName('grandma-passenger'), b=scene?.getObjectByName('grandpa-passenger');
      if (!a || !b || !model?.getObjectByName('rearHatch')) return null;
      return { model:model.userData.modelState,grandma:a.position.toArray(),grandpa:b.position.toArray(),
        grandmaInside:a.userData.onboard,grandpaInside:b.userData.onboard,hatch:model.getObjectByName('rearHatch').rotation.x,
        driver:scene.getObjectByName('driver-helper').position.toArray(),driverInside:scene.getObjectByName('driver-helper').userData.onboard,
        operating:scene.getObjectByName('driver-helper').userData.operating,elbow:scene.getObjectByName('driver-elbow-right')?.rotation.x,
        driverDoor:model.getObjectByName('driverDoor')?.rotation.y,panel:scene.getObjectByName('lift-control-panel').visible,
        deck:scene.getObjectByName('wheelchair-lift').position.y,fold:scene.getObjectByName('wheelchair-lift').rotation.x,
        car:model.parent.position.toArray(),grandmaMeshes:a.children[0]?.children.length,grandpaMeshes:b.children[0]?.children.length };
    });
    await expect.poll(async()=> (await sceneState())?.model,{timeout:20000}).toBe(fallback?'fallback':'ready');
    await expect.poll(async()=> (await sceneState())?.grandmaInside).toBe(true);
    const initial = await sceneState(); assert.equal(initial.grandpaInside,true);
    assert.equal(initial.driverInside,true); assert.ok(Math.abs(initial.driverDoor)<.001);
    assert.ok(initial.grandmaMeshes>0 && initial.grandpaMeshes>0);
    await page.screenshot({path:`.test-artifacts/passengers-${fallback?'fallback':'glb'}-inside.png`});
    const action = page.locator('.transfer-button');
    if (fallback) await action.tap(); else await action.click();
    await expect(page.locator('.passenger-status strong')).toHaveText('司機大哥下車準備');
    await expect.poll(async()=>Math.abs((await sceneState()).driverDoor)).toBeGreaterThan(.3);
    await expect(page.locator('.camera-switch')).toHaveText('鏡頭：接送視角');
    await expect(page.locator('.camera-switch')).toBeDisabled();
    await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w');
    assert.deepEqual((await sceneState()).car,initial.car,'input cannot move van with hatch opening');
    await expect(page.locator('.passenger-status strong')).toHaveText('平台下降中',{timeout:25000});
    const lowering = await sceneState();
    assert.deepEqual(lowering.grandpa,initial.grandpa); assert.equal(lowering.grandpaInside,true);
    assert.ok(lowering.grandma[2]>2.6); assert.ok(Math.abs(lowering.grandma[1]-lowering.deck)<.00001);
    assert.ok(lowering.hatch < -1.9);
    assert.deepEqual(lowering.driver,[-1.3,.14,2.6]); assert.equal(lowering.operating,true);assert.equal(lowering.panel,true);
    await expect.poll(async()=>Math.abs((await sceneState()).elbow-lowering.elbow),{intervals:[30,50,80]}).toBeGreaterThan(.01);
    await page.screenshot({path:`.test-artifacts/passengers-${fallback?'fallback':'glb'}-lowering.png`});
    await expect(page.locator('.passenger-status strong')).toHaveText('操控奶奶輪椅・爺爺留在車內',{timeout:20000});
    const outside = await sceneState(); assert.equal(outside.grandmaInside,false); assert.equal(outside.grandpaInside,true);
    assert.deepEqual(outside.driver,[-1.3,.14,2.6]);assert.equal(outside.operating,false);
    assert.deepEqual(outside.grandpa,initial.grandpa); assert.equal(outside.grandma[2],4.5); assert.equal(outside.deck,.14);
    await page.keyboard.down('w'); await page.waitForTimeout(150); await page.keyboard.up('w');
    await page.keyboard.down('Space'); await page.waitForTimeout(400); await page.keyboard.up('Space');
    assert.deepEqual((await sceneState()).car,initial.car,'outside wheelchair locks driving');
    await page.screenshot({path:`.test-artifacts/passengers-${fallback?'fallback':'glb'}-outside.png`});
    if (!fallback) {
      await page.evaluate(async()=>{
        const {_roots} = await import('/node_modules/.vite/deps/@react-three_fiber.js'); const THREE=await import('/node_modules/.vite/deps/three.js');
        const live = _roots.get(document.querySelector('canvas')).store.getState();
        const bus = live.scene.getObjectByName('service-van-model').parent.clone(true); bus.position.set(0,0,0); bus.rotation.set(0,0,0);
        const scene = new THREE.Scene(); scene.background = new THREE.Color('#e6eee8'); scene.add(bus);
        scene.add(new THREE.HemisphereLight('#fff8eb','#839e92',2.5)); const lamp=new THREE.DirectionalLight('#ffffff',2.5);lamp.position.set(3,8,6);scene.add(lamp);
        const camera=new THREE.PerspectiveCamera(38,1.6,.1,100);camera.position.set(6,3.6,8);camera.lookAt(0,1.1,1.7);
        const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1120,700);
        renderer.domElement.id='passenger-review';renderer.domElement.style.cssText='position:fixed;left:0;top:0;z-index:99999;width:1120px;height:700px';
        document.body.appendChild(renderer.domElement);renderer.render(scene,camera);
      });
      await page.locator('#passenger-review').screenshot({path:'.test-artifacts/passengers-transfer-review.png'});
      await page.locator('#passenger-review').evaluate(canvas=>canvas.remove());
    }
    if (fallback) await action.tap(); else await action.click();
    await expect(page.locator('.passenger-status strong')).toHaveText('平台上升中',{timeout:15000});
    const raising=await sceneState(); assert.deepEqual(raising.grandpa,initial.grandpa); assert.ok(Math.abs(raising.grandma[1]-raising.deck)<.00001);
    await expect(page.locator('.passenger-status strong')).toHaveText('兩位乘客在車內',{timeout:25000});
    await expect(page.locator('.camera-switch')).toHaveText('鏡頭：跟車');
    await expect.poll(async()=> Math.abs((await sceneState()).hatch)).toBeLessThan(.001);
    assert.equal((await sceneState()).grandmaInside,true);
    const returned=await sceneState();assert.equal(returned.driverInside,true);assert.ok(Math.abs(returned.driverDoor)<.001);assert.deepEqual(returned.driver,initial.driver);
    if (fallback) await action.tap(); else await page.keyboard.press('e');
    await expect(page.locator('.passenger-status strong')).toHaveText('升降平台展開中',{timeout:15000});
    await page.keyboard.press('r');
    await expect(page.locator('.passenger-status strong')).toHaveText('兩位乘客在車內');
    await expect.poll(async()=> Math.abs((await sceneState()).hatch)).toBeLessThan(.001);
    // Repeated resets immediately after opening catch races between request tokens,
    // the fixed-step controller, low-frequency HUD state and the camera reset.
    for (let i=0;i<3;i++) {
      if (fallback) await action.tap(); else await page.keyboard.press('e');
      await expect(page.locator('.passenger-status strong')).toHaveText('司機大哥下車準備');
      await page.keyboard.press('r');
      await expect(page.locator('.passenger-status strong')).toHaveText('兩位乘客在車內');
      await expect.poll(async()=> Math.abs((await sceneState()).hatch)).toBeLessThan(.001);
      assert.equal((await sceneState()).grandmaInside,true);
      await expect.poll(async()=>(await sceneState()).driverInside).toBe(true);assert.ok(Math.abs((await sceneState()).driverDoor)<.001);
    }
    await page.keyboard.down('w');
    await expect.poll(async()=>Number(await page.locator('.speed-panel strong').innerText())).toBeGreaterThan(0);
    await page.keyboard.press('e'); await expect(page.locator('.passenger-status small')).toHaveText('請先煞車停妥，再讓奶奶下車');
    await page.keyboard.up('w'); await page.keyboard.press('r');
    const layout=await page.locator('.passenger-panel,.transfer-button').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
    const viewport=page.viewportSize(); for(const rect of layout) assert.ok(rect.x>=0 && rect.y>=0 && rect.right<=viewport.width && rect.bottom<=viewport.height);
    assert.deepEqual(errors,[]);await page.close();
    console.log(`PASS: ${fallback?'Mobile fallback':'Desktop GLB'}: two occupants, opening/lowering/exit/boarding, grandpa stays aboard, driving lock and reset.`);
  }
} finally { await browser.close(); }
