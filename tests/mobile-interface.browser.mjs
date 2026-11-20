import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { dismissDrivingGuide } from './browser-support.mjs';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5173/?quality=low';
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('.test-artifacts/mobile-interface',{recursive:true});
const report={passed:false,errors:[],orientation:true,portraitOptional:true,landscapeZones:true,rotationReleasesInputs:true,firstHints:true,nearbyLabels:true,vibrationApiMockOnly:true};
const read=page=>page.evaluate(async()=>{
  const {useGame}=await import('/src/stores/game.ts');
  const {touchController}=await import('/src/game/vehicle/touchController.ts');
  const s=useGame.getState();return{x:s.x,z:s.z,mission:s.missionIndex,reset:s.resetKey,paused:s.controlsPaused,phase:s.transferPhase,
    throttle:touchController.InputThrottle,steer:touchController.InputSteer,reverse:touchController.InputReverse,brake:touchController.InputBrake};
});
const zones=async(page,width,height)=>{
  const joy=await page.locator('.touch-joystick').boundingBox();assert(joy&&joy.x+joy.width<width/2);
  for(const action of ['gas','brake','reverse']){const p=await page.locator(`.touch-${action}`).boundingBox();assert(p&&p.x>width/2&&p.y>=0&&p.y+p.height<=height+1);}
  assert(joy.y>=0&&joy.y+joy.height<=height+1);
};
try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.addInitScript(()=>{window.__hapticCalls=[];Object.defineProperty(navigator,'vibrate',{configurable:true,value:duration=>{window.__hapticCalls.push(duration);return true;}});});
  await page.goto(base);await page.getByRole('button',{name:'略過引導',exact:true}).click();
  await page.locator('main[data-loading-state=ready]').waitFor({timeout:30000});
  const notice=page.getByRole('dialog',{name:'請旋轉手機',exact:true});await expect(notice).toBeVisible();
  assert.equal(await page.getByRole('dialog').count(),1,'rotation advice never competes with onboarding');
  const before=await read(page);assert.equal(before.paused,true);
  await page.keyboard.down('w');await page.keyboard.press('r');await page.keyboard.press('e');await page.waitForTimeout(200);await page.keyboard.up('w');
  assert.deepEqual(await read(page),before,'reading the rotation notice pauses driving, transfer and reset');
  await page.screenshot({path:'.test-artifacts/mobile-interface/portrait-notice.png'});
  await page.setViewportSize({width:844,height:390});
  await expect(notice).toHaveCount(0);await expect.poll(async()=>(await read(page)).paused).toBe(false);await zones(page,844,390);
  await page.screenshot({path:'.test-artifacts/mobile-interface/landscape.png'});
  const cdp=await page.context().newCDPSession(page);
  const joy=await page.locator('.touch-joystick').boundingBox(),gas=await page.locator('.touch-gas').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:joy.x+joy.width*.75,y:joy.y+joy.height/2},{id:2,x:gas.x+gas.width/2,y:gas.y+gas.height/2}]});
  await expect.poll(async()=>(await read(page)).throttle).toBe(1);await expect.poll(async()=>(await read(page)).steer).toBeGreaterThan(0);
  assert.deepEqual(await page.evaluate(()=>window.__hapticCalls),[8,8]);
  await page.setViewportSize({width:390,height:844});
  await expect(notice).toBeVisible();
  await expect.poll(async()=>{const s=await read(page);return[s.throttle,s.steer,s.reverse,s.brake];}).toEqual([0,0,0,0]);
  await expect(page.locator('.touch-gas')).toHaveAttribute('aria-pressed','false');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const rotated=await read(page);assert.equal(rotated.mission,before.mission);assert.equal(rotated.reset,before.reset);
  await page.getByRole('button',{name:'繼續直向遊玩',exact:true}).click();await expect(notice).toHaveCount(0);
  await expect.poll(async()=>(await read(page)).paused).toBe(false);
  await expect(page.locator('.touch-hint')).toBeVisible();
  assert.notEqual(await page.locator('.touch-hint p').evaluate(node=>getComputedStyle(node).backgroundColor),'rgba(0, 0, 0, 0)');
  await expect(page.locator('[data-world-label]')).toHaveCount(1);await expect(page.locator('.target-label')).toHaveCount(1);
  await expect(page.locator('.touch-hint')).toHaveCount(0,{timeout:11000});
  await page.reload();await dismissDrivingGuide(page);await expect(page.locator('.touch-hint')).toHaveCount(0);
  await page.setViewportSize({width:568,height:320});await expect(notice).toHaveCount(0);await zones(page,568,320);
  await page.evaluate(()=>Object.defineProperty(navigator,'vibrate',{configurable:true,value:undefined}));
  const smallGas=await page.locator('.touch-gas').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:3,x:smallGas.x+smallGas.width/2,y:smallGas.y+smallGas.height/2}]});
  await expect.poll(async()=>(await read(page)).throttle).toBe(1);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.close();
  const desktop=await browser.newPage({viewport:{width:1440,height:900}});desktop.on('pageerror',error=>report.errors.push(error.message));
  await desktop.goto(base);await dismissDrivingGuide(desktop);
  await expect(desktop.getByRole('dialog',{name:'請旋轉手機'})).toHaveCount(0);
  await expect(desktop.locator('.drive-caption')).toBeVisible();await expect(desktop.locator('[data-world-label]')).toHaveCount(2);
  await desktop.screenshot({path:'.test-artifacts/mobile-interface/desktop-labels.png'});
  await expect(desktop.locator('.drive-caption')).toHaveCount(0,{timeout:11000});
  await desktop.reload();await dismissDrivingGuide(desktop);await expect(desktop.locator('.drive-caption')).toHaveCount(0);
  await desktop.close();assert.deepEqual(report.errors,[]);report.passed=true;
  await writeFile('.test-artifacts/mobile-interface/validation.json',JSON.stringify(report,null,2));
  console.log('PASS: Rotation advice/portrait choice, landscape controls, simultaneous input and release on rotation, first-only hints, nearby-label limits and optional haptics. Physical vibration is not tested.');
}finally{await browser.close();}
