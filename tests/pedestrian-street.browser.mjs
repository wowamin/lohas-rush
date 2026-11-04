import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
  page.on('pageerror',error=>{errors.push(error.message);console.log('PAGE ERROR:',error.message);});
  await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:5174/'}?scene=pedestrian`);
  await page.waitForFunction(async()=>{
    const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
    return !!_roots.get(document.querySelector('canvas'))?.store.getState().scene.getObjectByName('pedestrian-street');
  });
  let stats;
  await expect.poll(async()=>stats=await page.evaluate(async()=>{
    const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const state=_roots.get(document.querySelector('canvas'))?.store.getState();
    const street=state?.scene.getObjectByName('pedestrian-street');
    if(!street)return null;
    return {meshes:street.children.filter(child=>child.isMesh).length,triangles:street.children.filter(child=>child.isMesh).reduce((sum,mesh)=>sum+mesh.geometry.attributes.position.count/3,0),boundaries:street.navigation.boundaries.length};
  })).not.toBeNull();
  assert.ok(stats.meshes<=12); assert.ok(stats.triangles<20000);
  await mkdir('.test-artifacts',{recursive:true});
  await page.screenshot({path:'.test-artifacts/pedestrian-street-overview.png'});
  const debug=page.getByRole('button',{name:'Collision boundaries: off'});
  await debug.click();
  await expect(page.getByRole('button',{name:'Collision boundaries: on'})).toHaveAttribute('aria-pressed','true');
  const visible=await page.evaluate(async()=>{
    const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
    return _roots.get(document.querySelector('canvas')).store.getState().scene.getObjectByName('street-collision-debug').visible;
  }); assert.equal(visible,true);
  await page.getByRole('button',{name:'Collision boundaries: on'}).click();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByText('Pedestrian street study')).toBeVisible();
  await page.screenshot({path:'.test-artifacts/pedestrian-street-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: street preview, geometry budget, collision overlay and mobile viewport',stats);
} finally {await browser.close();}
