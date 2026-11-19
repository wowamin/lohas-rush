import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {dismissDrivingGuide} from './browser-support.mjs';

const folder='.test-artifacts/campuses';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|Shader Error|GL_INVALID|Framebuffer/.test(m.text()))errors.push(m.text());});
  await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:5173/?quality=low');await dismissDrivingGuide(page);
  await page.waitForFunction(()=>window.__LOHAS_RENDERING__?.environment==='ready');
  await expect(page.locator('[data-map-campus]')).toHaveCount(5);
  await expect(page.locator('.route-map svg')).toHaveAttribute('viewBox','-722 -722 1444 1444');
  const sites=await page.evaluate(async()=>{
    const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const {centerCampuses,campusPoint}=await import('/src/data/centerCampuses.ts');
    const {locations}=await import('/src/data/locations.ts');
    const scene=_roots.get(document.querySelector('canvas')).store.getState().scene;
    return centerCampuses.map(site=>{
      const grounds=scene.getObjectByName(`campus-${site.id}-grounds`),building=scene.getObjectByName(`${site.id}-center-building`);
      return{id:site.id,position:building.position.toArray(),groundsPosition:grounds.position.toArray(),rotation:grounds.rotation.y,parking:grounds.userData.parkingSpaces,arrival:locations.find(l=>l.id===site.id).arrival,expectedArrival:campusPoint(site,0,40)};
    });
  });
  for(const site of sites){assert.deepEqual(site.position,site.groundsPosition);assert.deepEqual(site.arrival,site.expectedArrival);assert.equal(site.parking,['longshan','yihe'].includes(site.id)?6:4);}
  await page.locator('.route-map').screenshot({path:`${folder}/gps-desktop.png`});
  // Independent views of the actual live scene. This never moves the car,
  // advances a mission, or replaces the game's main camera.
  const capture=async(id)=>{
    await page.evaluate(async id=>{
      const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const T=await import('/node_modules/.vite/deps/three.js');
      const {centerCampuses,campusPoint}=await import('/src/data/centerCampuses.ts');
      const state=_roots.get(document.querySelector('canvas')).store.getState(),scene=state.scene.clone(true);scene.fog=null;
      const camera=id?new T.OrthographicCamera(-95,95,70,-70,1,3000):new T.OrthographicCamera(-760,760,760,-760,1,4000);
      if(id){const site=centerCampuses.find(s=>s.id===id),p=campusPoint(site,100,160),target=campusPoint(site,0,28);camera.position.set(p[0],100,p[1]);camera.lookAt(target[0],0,target[1]);}
      else{camera.position.set(0,1800,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);}
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(id?1200:1400,id?900:1400);
      renderer.outputColorSpace=state.gl.outputColorSpace;renderer.toneMapping=state.gl.toneMapping;renderer.toneMappingExposure=state.gl.toneMappingExposure;
      renderer.domElement.id='campus-review';renderer.domElement.style.cssText='position:fixed;inset:0;z-index:99999';document.body.appendChild(renderer.domElement);renderer.render(scene,camera);
      window.__campusReviewRenderer=renderer;
    },id);
    await page.locator('#campus-review').screenshot({path:`${folder}/${id??'map-overview'}.png`});
    await page.evaluate(()=>{const r=window.__campusReviewRenderer;r.domElement.remove();r.dispose();r.forceContextLoss();delete window.__campusReviewRenderer;});
  };
  await capture(null);await capture('longshan');await capture('yihe');
  await page.keyboard.down('w');
  await expect.poll(()=>page.locator('.speed-panel strong').innerText().then(Number),{timeout:15000}).toBeGreaterThan(5);
  await page.keyboard.up('w');await page.keyboard.down('Space');
  await expect.poll(()=>page.locator('.speed-panel strong').innerText().then(Number),{timeout:15000}).toBe(0);
  await page.keyboard.up('Space');await page.keyboard.press('r');
  await expect.poll(()=>page.evaluate(async()=>{const {useGame}=await import('/src/stores/game.ts');const s=useGame.getState();return[s.x,s.z,s.missionIndex];})).toEqual([0,32,0]);
  await page.setViewportSize({width:390,height:844});await expect(page.locator('[data-map-campus]')).toHaveCount(5);
  await page.locator('.route-map').screenshot({path:`${folder}/gps-mobile.png`});
  assert.deepEqual(errors,[]);
  await writeFile(`${folder}/validation.json`,JSON.stringify({passed:true,sites,errors,drivingBrakingReset:true,desktopMobileGPS:true},null,2));
  console.log('PASS: five relocated buildings and campuses, real parking geometry, GPS extents, overview, desktop/mobile maps, shaders, driving, braking and reset.');
}finally{await browser.close();}
