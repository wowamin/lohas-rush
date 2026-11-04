import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
await mkdir('.test-artifacts',{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:850,height:720}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:5173/');await page.bringToFront();
  await page.locator('.target-label').filter({hasText:'大和'}).waitFor();
  const result=await page.evaluate(async()=>{
    const {findRoadRoute}=await import('/src/data/roadNetwork.ts');
    const {useGame}=await import('/src/stores/game.ts');
    const points=findRoadRoute('0-0','expansion--480-0'),held=new Set();let index=0;
    const key=(code,down)=>{if(held.has(code)===down)return;if(down)held.add(code);else held.delete(code);window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));};
    const start=performance.now();
    try{
      while(performance.now()-start<180000){
        const {x,z,angle,speed}=useGame.getState();
        if(Math.hypot(x+480,z)<3.5)return{arrived:true,x,z,mission:useGame.getState().missionIndex};
        while(index<points.length-1 && Math.hypot(x-points[index][0],z-points[index][1])<3.5)index++;
        const [tx,tz]=points[index],desired=Math.atan2(-(tx-x),-(tz-z));
        const error=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle)),target=Math.abs(error)>.45?15:30;
        key('KeyA',error>.07);key('KeyD',error<-.07);key('KeyW',speed<target);key('Space',speed>target+8);
        await new Promise(resolve=>setTimeout(resolve,35));
      }
      const {x,z}=useGame.getState();return{arrived:false,x,z,index};
    }finally{for(const code of [...held])key(code,false);}
  });
  assert.ok(result.arrived,JSON.stringify(result));assert.ok(result.x<-448);assert.equal(result.mission,0);
  await page.keyboard.down('Space');
  await expect.poll(()=>page.locator('.speed-panel strong').innerText().then(Number),{timeout:15000}).toBe(0);
  await page.keyboard.up('Space');
  await page.screenshot({path:'.test-artifacts/city-expansion-drive.png'});
  // Independent overview of the actual scene; no game state or car position changes.
  await page.evaluate(async()=>{
    const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const T=await import('/node_modules/.vite/deps/three.js');
    const state=_roots.get(document.querySelector('canvas')).store.getState(),scene=state.scene.clone(true);scene.fog=null;
    const camera=new T.OrthographicCamera(-565,565,565,-565,1,2000);camera.position.set(0,1000,0);camera.lookAt(0,0,0);
    const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,1000);
    renderer.domElement.id='expansion-review';renderer.domElement.style.cssText='position:fixed;inset:0;z-index:99999;width:1000px;height:1000px';
    document.body.appendChild(renderer.domElement);renderer.render(scene,camera);
  });
  await page.locator('#expansion-review').screenshot({path:'.test-artifacts/city-expansion-overview.png'});
  await page.locator('#expansion-review').evaluate(element=>element.remove());
  await page.keyboard.press('r');
  await expect.poll(()=>page.evaluate(async()=>{const {useGame}=await import('/src/stores/game.ts');const s=useGame.getState();return[s.x,s.z,s.missionIndex];})).toEqual([0,32,0]);
  assert.deepEqual(errors,[]);
  console.log('PASS: keyboard drive from spawn beyond the old boundary to the new west avenue, braking, map, reset and runtime.');
}finally{await browser.close();}
