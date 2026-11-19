import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {dismissDrivingGuide} from './browser-support.mjs';

await mkdir('.test-artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:5173/');await dismissDrivingGuide(page);
  await expect(page.locator('canvas')).toBeVisible();
  const result=await page.evaluate(async()=>{
    const {streetFurniture}=await import('/src/data/city.ts');
    const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const T=await import('/node_modules/.vite/deps/three.js');
    const store=_roots.get(document.querySelector('canvas')).store,state=store.getState();
    let batches=0,trees=0;
    const staticBatches=[],materials=new Set(),geometries=new Set();
    state.scene.traverse(node=>{if(node.isInstancedMesh){batches++;if(node.geometry.type==='CylinderGeometry')trees=node.count;}});
    const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(state.camera.projectionMatrix,state.camera.matrixWorldInverse));
    state.scene.traverse(node=>{if(node.userData.staticCell!==undefined){staticBatches.push(node);materials.add(node.material);geometries.add(node.geometry);}});
    // Inspect an actual long street with both kinds of furniture visible.
    const lamp=streetFurniture.find(f=>f.kind==='streetlight'&&f.x< -100&&f.z< -100&&streetFurniture.some(t=>t.kind==='tree'&&t.roadIndex===f.roadIndex&&Math.hypot(t.x-f.x,t.z-f.z)<20));
    if(!lamp)throw new Error('No inspectable tree/lamp street section');
    const nx=Math.cos(lamp.rotation),nz=-Math.sin(lamp.rotation);
    state.internal.subscribers.push({ref:{current:()=>{
      state.camera.position.set(lamp.x+nx*20+nz*18,12,lamp.z+nz*20-nx*18);
      state.camera.lookAt(lamp.x,2.5,lamp.z);state.camera.updateMatrixWorld();
    }},priority:0,store});
    state.internal.subscribers.sort((a,b)=>a.priority-b.priority);
    const vegetation=state.scene.getObjectByName('street-vegetation');
    return {batches,trees,expectedTrees:streetFurniture.filter(f=>f.kind==='tree').length,totalTrees:vegetation?.userData.totalTrees,staticCount:staticBatches.length,visibleStatic:staticBatches.filter(node=>frustum.intersectsObject(node)).length,materials:materials.size,geometries:geometries.size};
  });
  assert.equal(result.totalTrees,result.expectedTrees,'all existing tree positions are retained by the distance-culling system');
  assert.ok(result.trees>0&&result.trees<=result.expectedTrees,'nearby trunks render in an instanced batch; distant vegetation is culled');
  assert.ok(result.staticCount<=14*14*9,'regional batches are bounded by map cells and surfaces');
  assert.ok(result.visibleStatic>0&&result.visibleStatic<result.staticCount,'offscreen regions can be culled');
  assert.ok(result.materials<=9);assert.equal(result.geometries,1,'regions share box geometry and PBR materials');
  console.log('Regional scenery:',JSON.stringify(result));
  await page.addStyleTag({content:'header,aside,footer,.world-label,.drive-caption,.speed-panel,.route-map,.passenger-panel,.discovery-toast{display:none!important}'});
  await page.waitForTimeout(500);await page.screenshot({path:'.test-artifacts/street-furniture-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  await page.screenshot({path:'.test-artifacts/street-furniture-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: Roadside trees render separately, instancing remains bounded, desktop/mobile street views have no runtime errors.');
}finally{await browser.close();}
