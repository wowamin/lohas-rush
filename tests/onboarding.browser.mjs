import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const url=process.env.TEST_BASE_URL||'http://127.0.0.1:5173/';
await mkdir('.test-artifacts',{recursive:true});
const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
try{
  const desktop=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
  desktop.on('pageerror',e=>errors.push(e.message));await desktop.goto(url);
  await expect(desktop.getByRole('dialog')).toBeVisible();
  await expect(desktop.getByRole('dialog')).toContainText('桌機鍵盤與滑鼠');
  const before=await desktop.locator('.map-vehicle').getAttribute('transform');
  await desktop.keyboard.down('w');await desktop.keyboard.press('e');await desktop.waitForTimeout(350);await desktop.keyboard.up('w');
  assert.equal(await desktop.locator('.map-vehicle').getAttribute('transform'),before,'reading the guide must not move the vehicle');
  await expect(desktop.locator('.passenger-status strong')).toHaveText('兩位乘客在車內');
  await desktop.getByRole('button',{name:'略過引導',exact:true}).click();
  await expect(desktop.getByRole('dialog')).toHaveCount(0);
  await desktop.keyboard.down('w');await expect.poll(()=>desktop.locator('.speed-panel strong').innerText().then(Number)).toBeGreaterThan(5);
  await desktop.keyboard.up('w');await desktop.keyboard.press('r');
  await desktop.reload();await expect(desktop.locator('main')).toHaveAttribute('data-guide-state','closed');
  await desktop.getByRole('button',{name:'操作說明',exact:true}).click();
  await expect(desktop.getByRole('dialog')).toBeVisible();
  await desktop.keyboard.press('Escape');await expect(desktop.getByRole('dialog')).toHaveCount(0);
  await desktop.screenshot({path:'.test-artifacts/v01-desktop.png'});
  await desktop.close();
  const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url);
  await expect(mobile.getByRole('dialog')).toContainText('手機／平板觸控');
  await mobile.getByRole('button',{name:'開始探索',exact:true}).click();
  await expect(mobile.locator('.destination-strip')).toContainText('下一站：永春大和日照中心');
  for(const [width,height,name] of [[390,844,'portrait'],[844,390,'landscape'],[320,568,'small'],[667,375,'short-landscape'],[568,320,'small-landscape']]){
    await mobile.setViewportSize({width,height});
    await mobile.waitForTimeout(300);
    for(const expanded of [false,true]){
      if(expanded)await mobile.getByRole('button',{name:'展開資訊欄',exact:true}).click();
      if(expanded)await expect(mobile.locator('.mission-panel')).toHaveCSS('transform','none');
      else await expect.poll(async()=>Math.abs((await mobile.locator('.mission-panel').boundingBox()).x+(await mobile.locator('.mission-panel').boundingBox()).width)).toBeLessThan(1);
      const boxes=await mobile.locator('.mission-panel:not(.is-collapsed), .mission-panel.is-collapsed .mission-toggle, .destination-strip, .route-map, .speed-panel, .passenger-panel, .touch-button, .touch-joystick').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).map(n=>{const r=n.getBoundingClientRect();return {name:n.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
      for(const b of boxes)assert.ok(b.x>=-1&&b.y>=-1&&b.right<=width+1&&b.bottom<=height+1,JSON.stringify({name,expanded,outside:b}));
      for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(!overlap(boxes[i],boxes[j]),JSON.stringify({name,expanded,overlap:[boxes[i],boxes[j]]}));
      assert.equal(await mobile.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
      if(expanded)await mobile.getByRole('button',{name:'縮小資訊欄',exact:true}).click();
      if(expanded)await expect.poll(async()=>Math.abs((await mobile.locator('.mission-panel').boundingBox()).x+(await mobile.locator('.mission-panel').boundingBox()).width)).toBeLessThan(1);
    }
    await mobile.screenshot({path:'.test-artifacts/v01-mobile-'+name+'.png'});
  }
  await mobile.locator('.route-map-toggle').click();
  await expect(mobile.locator('.route-map')).toHaveClass(/is-collapsed/);
  await mobile.locator('.route-map-toggle').click();
  await expect(mobile.locator('.route-map')).not.toHaveClass(/is-collapsed/);
  await mobile.close();
  const blocked=await browser.newPage();
  await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked storage');};Storage.prototype.setItem=()=>{throw new Error('blocked storage');};});
  await blocked.goto(url);await blocked.getByRole('button',{name:'略過引導',exact:true}).click();
  await expect(blocked.getByRole('dialog')).toHaveCount(0);
  await blocked.close();assert.deepEqual(errors,[]);
  console.log('PASS: First-run keyboard/touch guide, skip/persistence/Escape/help/storage fallback, paused inputs, and non-overlapping mobile layouts.');
}finally{await browser.close();}
