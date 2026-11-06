import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {dismissDrivingGuide} from './browser-support.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const url=process.env.TEST_BASE_URL||'http://127.0.0.1:5173/';
const key='lohas-rush:exploration';
await mkdir('.test-artifacts',{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await dismissDrivingGuide(page);
  const read=()=>page.evaluate(async()=>{
    const {useGame}=await import('/src/stores/game.ts');
    const {explorationStore}=await import('/src/stores/exploration.ts');
    const {missionIndex,completed,speed,x,z,resetKey}=useGame.getState();
    return {missionIndex,completed,speed,x,z,resetKey,entries:explorationStore.getState().entries,notices:explorationStore.getState().notices};
  });
  await expect.poll(async()=>!!(await read()).entries.clinic).toBe(true);
  await expect(page.locator('.discovery-toast')).toContainText('首次發現');
  assert.equal((await read()).missionIndex,0);
  const marker=page.locator('[data-exploration-marker=clinic]');await expect(marker).toHaveAttribute('data-exploration-status','discovered');
  await expect(page.locator('[data-exploration-marker=daihe]')).toHaveAttribute('aria-label','未發現據點');
  const open=()=>page.getByRole('button',{name:'探索日記',exact:true}).click();
  await open();await expect(page.locator('[data-journal-count=total]')).toHaveText('12');
  await page.getByRole('button',{name:'五間日照',exact:true}).click();await expect(page.locator('.journal-list-card')).toHaveCount(5);
  await expect(page.locator('.journal-story')).toHaveCount(0);
  await page.getByRole('button',{name:'其他服務',exact:true}).click();await expect(page.locator('.journal-list-card')).toHaveCount(7);
  await expect(page.locator('[data-exploration-id=clinic] [data-action=interact]')).toBeDisabled();
  const still=await read();await page.keyboard.press('r');await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');
  const after=await read();for(const field of ['x','z','speed','missionIndex','resetKey'])assert.equal(after[field],still[field],'journal suppresses driving and reset keyboard input');
  await page.getByRole('button',{name:'關閉探索日記'}).click();

  // Real input follows the existing central road toward the clinic. No teleport,
  // mission action or fabricated interaction pose is used by this browser test.
  const drove=await page.evaluate(async()=>{
    const {useGame}=await import('/src/stores/game.ts');
    const {explorationLocations}=await import('/src/data/explorationLocations.ts');
    const {findRoadRoute,nearestRoadNode}=await import('/src/data/roadNetwork.ts');
    const destination=explorationLocations.find(p=>p.id==='clinic'),held=new Set();
    const start=useGame.getState(),points=findRoadRoute(nearestRoadNode(start.x,start.z),nearestRoadNode(...destination.position));let index=points.length>1?1:0;
    const key=(code,down)=>{if(held.has(code)===down)return;if(down)held.add(code);else held.delete(code);window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));};
    const began=performance.now();
    try{while(performance.now()-began<45000){
      const s=useGame.getState();
      if(Math.hypot(s.x-destination.position[0],s.z-destination.position[1])<destination.interactionRadius-2){key('KeyW',false);key('KeyA',false);key('KeyD',false);return true;}
      while(index<points.length-1&&Math.hypot(s.x-points[index][0],s.z-points[index][1])<3)index++;
      const target=points[index],desired=Math.atan2(-(target[0]-s.x),-(target[1]-s.z));
      const error=Math.atan2(Math.sin(desired-s.angle),Math.cos(desired-s.angle));
      key('KeyA',error>.08);key('KeyD',error<-.08);key('KeyW',s.speed<12);key('Space',s.speed>15);
      await new Promise(r=>setTimeout(r,35));
    }return false;}finally{for(const code of [...held])key(code,false);}
  });assert.equal(drove,true,'drive into the clinic interaction range');
  await open();await expect(page.locator('[data-exploration-id=clinic] [data-action=interact]')).toBeDisabled();
  await expect(page.locator('[data-exploration-id=clinic]')).toContainText('停穩');
  await page.getByRole('button',{name:'關閉探索日記'}).click();
  await page.keyboard.down('Space');
  await expect.poll(()=>page.evaluate(async()=>{const {explorationStore}=await import('/src/stores/exploration.ts');return explorationStore.getState().interactionProblem('clinic');})).toBeNull();
  await page.keyboard.up('Space');
  await open();
  const interact=page.locator('[data-exploration-id=clinic] [data-action=interact]');await expect(interact).toBeEnabled();await interact.click();
  await expect(page.locator('.journal-story')).toContainText('暫定遊戲文案');
  assert.equal((await read()).entries.clinic.completedAt,null,'opening a card alone does not complete exploration');
  await page.getByRole('button',{name:'關閉探索日記'}).click();
  assert.equal((await read()).entries.clinic.completedAt,null,'closing without confirmation preserves discovered status');
  await open();await interact.click();await page.getByRole('button',{name:'確認並記錄探索完成',exact:true}).click();
  await expect(page.locator('[data-journal-count=completed]')).toHaveText('1');await expect(marker).toHaveAttribute('data-exploration-status','completed');
  assert.equal((await read()).missionIndex,0,'clinic exploration is independent from the daycare mainline');
  await page.screenshot({path:'.test-artifacts/exploration-card-desktop.png'});
  await page.getByRole('button',{name:'關閉探索日記'}).click();await page.keyboard.press('r');
  await expect.poll(async()=>(await read()).z).toBe(32);assert.notEqual((await read()).entries.clinic.completedAt,null);
  await page.reload();await dismissDrivingGuide(page);await expect.poll(async()=>(await read()).entries.clinic?.completedAt).toBeGreaterThanOrEqual(0);
  assert.deepEqual((await read()).notices,[],'reload does not repeat previously discovered notices');
  await open();await page.locator('[data-exploration-id=clinic]').getByRole('button',{name:'重讀日記'}).click();
  await expect(page.locator('[data-card-mode=journal-entry]')).toBeVisible();
  await expect(page.getByRole('button',{name:'確認並記錄探索完成',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'回據點清單'}).click();
  await page.getByLabel('日記狀態',{exact:true}).selectOption('completed');await expect(page.locator('.journal-list-card')).toHaveCount(1);
  await page.getByRole('button',{name:'清除探索資料…',exact:true}).click();
  await page.getByRole('button',{name:'取消，保留日記'}).click();await expect(page.locator('[data-journal-count=completed]')).toHaveText('1');
  await page.getByRole('button',{name:'清除探索資料…',exact:true}).click();await page.getByRole('button',{name:'確定清除探索資料',exact:true}).click();
  await expect(page.locator('[data-journal-count=discovered]')).toHaveText('0');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('lohas-rush:driving-guide:v1')),'seen');
  await page.getByRole('button',{name:'關閉探索日記'}).click();await page.waitForTimeout(250);assert.deepEqual((await read()).entries,{});
  await page.evaluate(key=>localStorage.setItem(key,'{corrupt'),key);await page.reload();await dismissDrivingGuide(page);await open();
  await expect(page.locator('.journal-storage-note')).toContainText('損壞');
  assert.deepEqual(errors,[]);await page.close();

  const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url);await dismissDrivingGuide(mobile);
  for(const [width,height,name] of [[390,844,'portrait'],[844,390,'landscape'],[320,568,'small']]){
    await mobile.setViewportSize({width,height});
    await mobile.getByRole('button',{name:'探索日記',exact:true}).click();
    const rect=await mobile.locator('.exploration-journal').boundingBox();assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width&&rect.y+rect.height<=height);
    assert.ok(await mobile.locator('header').evaluate(n=>n.scrollWidth<=innerWidth),'header retains journal and help controls within the viewport');
    await mobile.screenshot({path:'.test-artifacts/exploration-journal-'+name+'.png'});
    await mobile.getByRole('button',{name:'關閉探索日記'}).click();
  }
  await mobile.close();assert.deepEqual(errors,[]);
  const blocked=await browser.newPage();
  blocked.on('pageerror',e=>errors.push(e.message));
  await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked');};Storage.prototype.setItem=()=>{throw new Error('quota');};});
  await blocked.goto(url);await dismissDrivingGuide(blocked);await blocked.waitForTimeout(200);
  await blocked.getByRole('button',{name:'探索日記',exact:true}).click();await expect(blocked.locator('.journal-storage-note')).toContainText('無法');
  await blocked.close();assert.deepEqual(errors,[]);
  console.log('PASS: Real driving discovery/parking/card confirmation, independent mainline/reset, reload, rereading, map status, two-step clearing, corrupt saves and mobile journal.');
}finally{await browser.close();}
