import {dismissDrivingGuide} from './browser-support.mjs';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const baseURL=process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
await mkdir('.test-artifacts',{recursive:true});
try {
  for (const mobile of [false,true]) {
    const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    if(mobile) await page.route('**/lohas_service_van.glb',route=>route.abort());
    await page.goto(baseURL); await dismissDrivingGuide(page);await page.locator('.transfer-button').waitFor();await page.bringToFront();
    await page.waitForFunction(async()=>{
      const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
      return _roots.get(document.querySelector('canvas'))?.store.getState().scene.getObjectByName('caregiver-helper')?.userData.onboard===true;
    });
    await expect.poll(()=>page.evaluate(async()=>{
      const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
      return _roots.get(document.querySelector('canvas'))?.store.getState().scene.getObjectByName('caregiver-helper')?.position.toArray();
    })).toEqual([.55,.75,-1.1]);
    await page.locator('.transfer-button').click();
    await expect(page.locator('.passenger-status strong')).toHaveText('司機大哥下車準備');
    await page.waitForFunction(async()=>{
      const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js'),scene=_roots.get(document.querySelector('canvas'))?.store.getState().scene;
      return (scene?.getObjectByName('passengerDoor')?.rotation.y??0)>.3;
    });
    await expect(page.locator('.passenger-status strong')).toHaveText('操控奶奶輪椅・爺爺留在車內',{timeout:90000});
    await expect(page.locator('.camera-switch')).toHaveText('鏡頭：輪椅跟隨');
    const read=async()=>page.evaluate(async()=>{
      const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const scene=_roots.get(document.querySelector('canvas')).store.getState();
      const a=scene.scene.getObjectByName('grandma-passenger'), b=scene.scene.getObjectByName('grandpa-passenger');
      const helper=scene.scene.getObjectByName('caregiver-helper');
      return {chair:a.position.toArray(),yaw:a.rotation.y,bus:b.parent.parent.position.toArray(),grandpa:b.position.toArray(),inside:b.userData.onboard,camera:scene.camera.position.toArray(),helper:helper.position.toArray(),helperYaw:helper.rotation.y,helperWalking:helper.userData.walking,helperPushing:helper.userData.pushing,helperVisible:helper.visible,helperOnboard:helper.userData.onboard,helperDoor:scene.scene.getObjectByName('passengerDoor').rotation.y,helperWorld:helper.getWorldPosition(scene.camera.position.clone()).toArray()};
    });
    // Reproduce the recordings: leave grandma at the dock without any input.
    // Visibility alone missed the old camera oscillation; sample its motion too.
    const stationary=await page.evaluate(async()=>{
      const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const camera=_roots.get(document.querySelector('canvas')).store.getState().camera;
      const started=performance.now(),samples=[];
      while(performance.now()-started<7000){
        await new Promise(requestAnimationFrame);
        if(performance.now()-started>3500)samples.push([...camera.position.toArray(),...camera.quaternion.toArray()]);
      }
      return samples;
    });
    assert.ok(stationary.length>10);
    const origin=stationary[0];
    const drift=Math.max(...stationary.map(sample=>Math.hypot(...sample.map((v,i)=>v-origin[i]))));
    assert.ok(drift<.05,`stationary camera must settle instead of orbiting or snapping: ${drift}`);
    await page.screenshot({path:`.test-artifacts/camera-still-${mobile?'mobile-fallback':'desktop'}.png`});
    const initial=await read();const cdp=mobile?await page.context().newCDPSession(page):null;
    assert.ok(Math.abs(Math.abs(initial.yaw)-Math.PI)<1e-8,'grandma keeps her seated orientation when wheelchair control begins');
    const assertHelper=pose=>{
      assert.equal(pose.helperVisible,true);assert.equal(pose.helperPushing,true);
      assert.ok(Math.abs(pose.helper[0]-(pose.chair[0]-Math.sin(pose.yaw)*.72))<1e-7);
      assert.ok(Math.abs(pose.helper[2]-(pose.chair[2]-Math.cos(pose.yaw)*.72))<1e-7);
      assert.ok(Math.abs(Math.sin(pose.helperYaw-pose.yaw))<1e-7);
    };assertHelper(initial);
    const keyByAction={forward:'w',reverse:'s',left:'a',stop:'Space'};
    const labelByAction={forward:'前進',reverse:'後退',left:'左轉',stop:'停下'};
    const hold=async action=>{
      if(!mobile) return page.keyboard.down(keyByAction[action]);
      const box=await page.getByRole('button',{name:labelByAction[action],exact:true}).boundingBox();
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:box.x+box.width/2,y:box.y+box.height/2}]});
    };
    const release=async action=>mobile?cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}):page.keyboard.up(keyByAction[action]);
    const stop=async()=>{
      await hold('stop');await expect.poll(async()=>Number(await page.locator('.speed-panel strong').innerText())).toBe(0);
      await page.waitForTimeout(300);await release('stop');
    };
    await hold('reverse');await expect.poll(async()=>(await read()).chair[2],{timeout:12000}).toBeGreaterThan(initial.chair[2]+2.2);
    const pushing=await read();assertHelper(pushing);assert.ok(pushing.helperWalking>.1);await release('reverse');await stop();
    const walking=await read();assert.deepEqual(walking.bus,initial.bus);assert.deepEqual(walking.grandpa,initial.grandpa);assert.equal(walking.inside,true);
    assertHelper(walking);assert.equal(walking.helperWalking,0);
    assert.ok(Math.hypot(...walking.camera.map((value,i)=>value-initial.camera[i]))>1,'camera follows grandma');
    await expect(page.locator('.transfer-button')).toBeDisabled();
    await page.keyboard.press('e');await expect(page.locator('.passenger-status small')).toHaveText('請回到巴士後方的上車標記');
    await page.screenshot({path:`.test-artifacts/wheelchair-${mobile?'mobile-fallback':'desktop'}-street.png`});
    if(!mobile){
      await page.evaluate(async()=>{
        const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js'),THREE=await import('/node_modules/.vite/deps/three.js');
        const live=_roots.get(document.querySelector('canvas')).store.getState(),scene=new THREE.Scene();scene.background=new THREE.Color('#e6eee8');
        const origin=live.scene.getObjectByName('grandma-passenger').position;
        for(const name of ['grandma-passenger','caregiver-helper']){const actor=live.scene.getObjectByName(name).clone(true);actor.position.sub(origin);scene.add(actor);}
        scene.add(new THREE.HemisphereLight('#fff8eb','#829b8e',2.5));const light=new THREE.DirectionalLight('#ffffff',2.5);light.position.set(-3,6,-5);scene.add(light);
        const camera=new THREE.PerspectiveCamera(38,1.4,.1,50);camera.position.set(-3,2.1,-4);camera.lookAt(0,.8,.30);
        const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(980,700);
        renderer.domElement.id='caregiver-review';renderer.domElement.style.cssText='position:fixed;left:0;top:0;z-index:99999;width:980px;height:700px';document.body.appendChild(renderer.domElement);renderer.render(scene,camera);
      });
      await page.locator('#caregiver-review').screenshot({path:'.test-artifacts/caregiver-pushing-review.png'});await page.locator('#caregiver-review').evaluate(canvas=>canvas.remove());
    }
    await hold('forward');await expect.poll(async()=>(await read()).chair[2],{timeout:14000}).toBeLessThan(2.75);
    await expect.poll(async()=>Number(await page.locator('.speed-panel strong').innerText()),{timeout:6000}).toBe(0);await release('forward');
    // Let the rendered pose finish interpolating after the collision stop.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const contact=await read();assert.ok(contact.chair[2]>=2.65-1e-6,'wheelchair stops before parked bus');assert.deepEqual(contact.bus,initial.bus);
    await hold('left');await page.waitForTimeout(500);await release('left');
    const turned=await read();assert.ok(Math.abs(turned.yaw-contact.yaw)>.2);assert.deepEqual(turned.chair,contact.chair,'chair turns in place');
    assertHelper(turned);
    // Give both people clearance before turning back toward the boarding mark.
    await hold('reverse');await expect.poll(async()=>(await read()).chair[2],{timeout:14000}).toBeGreaterThan(5.3);await release('reverse');await stop();
    // Return using only keyboard events and the same low-frequency telemetry as the map.
    const arrived=await page.evaluate(async()=>{
      const held=new Set();
      const {useGame}=await import('/src/stores/game.ts');
      const read=()=>{
        // GPS now uses an unrotated position dot. Read heading from the same
        // public telemetry, rather than parsing a removed SVG rotation.
        const {x,z,angle,parkedBusX,parkedBusZ}=useGame.getState();
        return {x,z,angle,parkedBusX,parkedBusZ};
      };
      const key=(code,down)=>{if(held.has(code)===down)return;if(down)held.add(code);else held.delete(code);window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));};
      const started=performance.now();
      try {
        while(performance.now()-started<15000){
          const s=read(),dx=s.parkedBusX-s.x,dz=s.parkedBusZ+4.5-s.z;
          if(Math.hypot(dx,dz)<.2){key('KeyW',false);key('KeyA',false);key('KeyD',false);key('Space',true);await new Promise(r=>setTimeout(r,500));return {arrived:true};}
          const desired=Math.atan2(-dx,-dz),error=Math.atan2(Math.sin(desired-s.angle),Math.cos(desired-s.angle));
          key('KeyA',error>.04);key('KeyD',error<-.04);key('KeyW',Math.abs(error)<.22);key('Space',Math.abs(error)>.3);
          await new Promise(r=>setTimeout(r,35));
        }return {arrived:false,...read()};
      }finally{for(const code of held)key(code,false);}
    });
    if(!arrived.arrived) await page.screenshot({path:'.test-artifacts/wheelchair-return-debug.png'});
    assert.equal(arrived.arrived,true,`returns to the real boarding marker: ${JSON.stringify(arrived)}`);
    await expect(page.locator('.transfer-button')).toBeEnabled();await page.locator('.transfer-button').click();
    // Fixed-step simulation intentionally caps long frames. SwiftShader can
    // take more wall time than the animation's simulated duration; still
    // require the full driver/door/lift sequence to finish, with a hard bound.
    await expect(page.locator('.passenger-status strong')).toHaveText('兩位乘客在車內',{timeout:60000});
    await expect(page.locator('.camera-switch')).toHaveText('鏡頭：跟車');
    await expect(page.locator('.speed-panel .eyebrow')).toHaveText('SERVICE VAN · 01');
    const waitingHelper=await read();assert.equal(waitingHelper.helperPushing,false);assert.equal(waitingHelper.helperOnboard,true);assert.deepEqual(waitingHelper.helper,[.55,.75,-1.1]);assert.ok(Math.abs(waitingHelper.helperDoor)<1e-8);
    await page.keyboard.down('w');await expect.poll(async()=>Number(await page.locator('.speed-panel strong').innerText())).toBeGreaterThan(0);await page.keyboard.up('w');
    const riding=await read();assert.deepEqual(riding.helper,waitingHelper.helper);assert.equal(riding.helperOnboard,true);
    assert.ok(Math.hypot(...riding.helperWorld.map((v,i)=>v-waitingHelper.helperWorld[i]))>.01,'caregiver rides in the front passenger seat with the moving van');
    await page.keyboard.press('r');await expect.poll(async()=>(await read()).bus[2]).toBe(32);
    await expect.poll(async()=>(await read()).helperOnboard).toBe(true);assert.deepEqual((await read()).helper,[.55,.75,-1.1]);
    assert.deepEqual(errors,[]);await page.close();
    console.log(`PASS: ${mobile?'Mobile touch/fallback':'Desktop keyboard'} wheelchair movement, camera, bus collision, turn in place, docking and driving handoff.`);
  }
}finally{await browser.close();}
