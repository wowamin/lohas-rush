import {dismissDrivingGuide} from './browser-support.mjs';
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
await mkdir('.test-artifacts',{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:5175/'); await dismissDrivingGuide(page);await page.bringToFront();
  await page.locator('.transfer-button').waitFor();
  const read=()=>page.evaluate(async()=>{
    const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const state=_roots.get(document.querySelector('canvas'))?.store.getState();
    const bus=state?.scene.getObjectByName('service-van-model')?.parent;
    if(!bus)return null;
    return{position:state.camera.position.toArray(),bus:bus.position.toArray()};
  });
  await expect.poll(async()=>!!(await read())?.position).toBe(true);
  const initial=await read();
  const settle=async()=>{
    let previous=(await read()).position,stable=0;
    await expect.poll(async()=>{
      await page.evaluate(()=>new Promise(requestAnimationFrame));
      const current=(await read()).position;
      stable=Math.hypot(...current.map((v,i)=>v-previous[i]))<.003?stable+1:0;previous=current;return stable;
    },{timeout:15000,intervals:[100,200,300]}).toBeGreaterThanOrEqual(3);
  };
  const drag=async(dx,dy=0,button='right')=>{
    await page.mouse.move(590,400);await page.mouse.down({button});
    await page.mouse.move(590+dx,400+dy,{steps:12});await page.mouse.up({button});
    await page.waitForTimeout(1600);
    await settle();
  };
  await drag(250,0,'left');assert.deepEqual((await read()).position,initial.position,'left drag cannot orbit');
  const distance=pose=>Math.hypot(pose.position[0]-pose.bus[0],pose.position[1]-1.2,pose.position[2]-pose.bus[2]);
  await page.mouse.move(650,400);await page.mouse.wheel(0,-400);await page.waitForTimeout(1300);
  assert.ok(distance(await read())<distance(initial)-2,'wheel up zooms in');
  await page.mouse.wheel(0,800);await page.waitForTimeout(1800);assert.ok(distance(await read())>distance(initial)+2,'wheel down zooms out');
  for(let i=0;i<10;i++)await page.mouse.wheel(0,-100000);await page.waitForTimeout(1800);
  assert.ok(Math.abs(distance(await read())-4)<.1,'nearest requested zoom stays outside the van');
  for(let i=0;i<10;i++)await page.mouse.wheel(0,100000);await page.waitForTimeout(2500);
  assert.ok(Math.abs(distance(await read())-40)<.1,'farthest zoom is bounded');
  assert.deepEqual((await read()).bus,initial.bus);
  await page.keyboard.press('r');await page.waitForTimeout(300);assert.deepEqual((await read()).position,initial.position);
  const headings=[];
  for(let i=0;i<4;i++){
    await drag(314);const pose=await read();
    headings.push(Math.atan2(pose.position[0]-pose.bus[0],pose.position[2]-pose.bus[2]));
    assert.deepEqual(pose.bus,initial.bus,'looking around does not move the bus');
  }
  for(let i=0;i<4;i++)assert.ok(Math.abs(Math.atan2(Math.sin(headings[i]+(i+1)*1.57),Math.cos(headings[i]+(i+1)*1.57)))<.08,'four drags cover all 360 degrees');
  const stopped=await read();await page.mouse.move(850,470);await page.waitForTimeout(800);
  assert.ok(Math.hypot(...(await read()).position.map((v,i)=>v-stopped.position[i]))<.05,'release retains the selected angle');
  await drag(0,220);const elevated=await read();assert.ok(elevated.position[1]>stopped.position[1]);
  await page.keyboard.press('r');await page.waitForTimeout(300);assert.deepEqual((await read()).position,initial.position);
  // Actual pointer capture, blur cancellation, and suppression of canvas menus.
  await page.mouse.move(590,400);await page.mouse.down({button:'right'});await page.mouse.move(700,400,{steps:5});
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(1200);
  assert.equal(await page.locator('canvas.is-orbiting').count(),0);
  const blurred=await read();await page.mouse.move(900,400);await page.mouse.up({button:'right'});await page.waitForTimeout(700);
  assert.ok(Math.hypot(...(await read()).position.map((v,i)=>v-blurred.position[i]))<.1);
  assert.equal(await page.locator('canvas').evaluate(canvas=>canvas.dispatchEvent(new MouseEvent('contextmenu',{cancelable:true,bubbles:true}))),false);
  await page.keyboard.press('r');await page.waitForTimeout(200);
  await drag(240);await page.keyboard.press('c');await page.waitForTimeout(2200);
  await expect(page.locator('.camera-switch')).toHaveText('鏡頭：高視角');assert.ok((await read()).position[1]>16);
  await page.keyboard.press('r');await page.waitForTimeout(200);
  await page.locator('.transfer-button').click();await expect(page.locator('.passenger-status strong')).toHaveText('操控奶奶輪椅・爺爺留在車內',{timeout:30000});
  await page.waitForTimeout(2500);const chairView=await read();await drag(240,30);
  assert.ok(Math.hypot(...(await read()).position.map((v,i)=>v-chairView.position[i]))>1,'wheelchair supports right drag');
  await page.screenshot({path:'.test-artifacts/orbit-wheelchair.png'});
  const heldView=await read();await page.waitForTimeout(1500);
  assert.ok(Math.hypot(...(await read()).position.map((v,i)=>v-heldView.position[i]))<.1,'manual orbit does not fight automatic avoidance');
  await page.mouse.move(650,400);await page.mouse.wheel(0,300);await page.waitForTimeout(1500);
  assert.ok(Math.hypot(...(await read()).position.map((v,i)=>v-heldView.position[i]))>1,'wheelchair view also supports wheel zoom');
  await page.keyboard.press('r');await page.waitForTimeout(200);assert.deepEqual((await read()).position,initial.position);
  assert.deepEqual(errors,[]);console.log('PASS: wheel zoom in/out and limits, right mouse 360 orbit, pitch, release, blur, C/R reset, stationary bus and wheelchair view.');
}finally{await browser.close();}
