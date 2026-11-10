import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dismissDrivingGuide } from './browser-support.mjs';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5173/?quality=low';
await mkdir('.test-artifacts/rendering',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
  const errors=[],shaderErrors=[],resources=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|Shader Error|GL_INVALID|Framebuffer/.test(m.text()))shaderErrors.push(m.text());});
  page.on('response',r=>{if(/lohas-afternoon\.hdr|lohas_service_van\.glb|lohas_building_reference\.glb/.test(r.url()))resources.push({url:r.url(),status:r.status()});});
  await page.goto(base);await dismissDrivingGuide(page);
  await page.waitForFunction(()=>window.__LOHAS_RENDERING__?.environment==='ready');
  const inspect=()=>page.evaluate(async()=>{
    const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const {useGame}=await import('/src/stores/game.ts');
    const state=_roots.get(document.querySelector('canvas')).store.getState(),game=useGame.getState();
    const sun=state.scene.children.find(o=>o.isDirectionalLight);
    const surfaceColors=[];state.scene.traverse(o=>{if(o.name.startsWith('city-surface-'))surfaceColors.push({name:o.name,vertexColors:o.material.vertexColors,hasVertexAttribute:!!o.geometry.getAttribute('color'),hasInstanceColors:!!o.instanceColor});});
    const headquarters=state.scene.getObjectByName('headquarters-reference');
    return{scene:state.scene.uuid,camera:state.camera.position.toArray(),fov:state.camera.fov,environment:!!state.scene.environment,
      colorSpace:state.gl.outputColorSpace,toneMapping:state.gl.toneMapping,shadowSize:sun.shadow.map?.width??sun.shadow.mapSize.x,
      paused:game.controlsPaused,mission:game.missionIndex,reset:game.resetKey,x:game.x,z:game.z,
      vegetation:state.scene.getObjectByName('street-vegetation')?.userData,surfaceColors,stats:window.__LOHAS_RENDERING__,
      headquartersVertices:headquarters?.geometry.getAttribute('position').count??0};
  });
  await expect.poll(async()=>(await inspect()).headquartersVertices??0,{timeout:30000}).toBeGreaterThan(0);
  const original=await inspect();assert.equal(original.colorSpace,'srgb');assert.equal(original.toneMapping,4);assert(original.environment);
  for(const surface of original.surfaceColors){assert(surface.hasInstanceColors);assert(!surface.vertexColors||surface.hasVertexAttribute,`${surface.name} cannot read a missing vertex color attribute`);}
  await page.getByRole('button',{name:'畫面設定',exact:true}).click();
  for(const [quality,size]of [['low',512],['medium',1536],['high',2048]]){
    await page.getByLabel('畫質',{exact:true}).selectOption(quality);
    await expect.poll(async()=>(await inspect()).shadowSize,{timeout:30000}).toBe(size);
    const state=await inspect();assert.equal(state.scene,original.scene);assert.equal(state.mission,original.mission);assert.equal(state.reset,original.reset);
    assert(state.vegetation.visibleTrees>0&&state.vegetation.visibleTrees<=state.vegetation.totalTrees);
  }
  await page.getByLabel('柔和高光 Bloom',{exact:true}).check();
  await page.waitForTimeout(600);await page.getByLabel('柔和高光 Bloom',{exact:true}).uncheck();
  await page.getByRole('button',{name:'建築展示',exact:true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-view-mode','showcase');
  assert.equal((await inspect()).paused,true);
  const beforeOrbit=await inspect();
  await page.mouse.move(650,440);await page.mouse.down();await page.mouse.move(820,460,{steps:8});await page.mouse.up();
  await expect.poll(async()=>Math.hypot(...(await inspect()).camera.map((v,i)=>v-beforeOrbit.camera[i])),{timeout:15000}).toBeGreaterThan(1);
  await page.keyboard.down('w');await page.waitForTimeout(350);await page.keyboard.up('w');
  const frozen=await inspect();assert.equal(frozen.x,original.x);assert.equal(frozen.z,original.z);assert.equal(frozen.mission,original.mission);
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'擷取 PNG 畫面',exact:true}).click()]);
  await download.saveAs('.test-artifacts/rendering/showcase-capture.png');
  await page.screenshot({path:'.test-artifacts/rendering/showcase-ui.png'});
  await page.getByLabel('展示建築',{exact:true}).selectOption('xinying');
  await expect.poll(async()=>Math.hypot(...(await inspect()).camera.map((v,i)=>v-frozen.camera[i])),{timeout:15000}).toBeGreaterThan(20);
  await page.getByRole('button',{name:'返回駕駛',exact:true}).click();
  assert.equal((await inspect()).paused,false);
  await page.getByLabel('畫質',{exact:true}).selectOption('low');
  const speed=()=>page.locator('.speed-panel strong').innerText().then(Number);
  await page.keyboard.down('w');await expect.poll(speed,{timeout:15000}).toBeGreaterThan(5);
  await expect(page.getByRole('button',{name:'建築展示',exact:true})).toBeDisabled();
  await page.keyboard.up('w');await page.keyboard.down('Space');await expect.poll(speed,{timeout:15000}).toBe(0);await page.keyboard.up('Space');
  await page.keyboard.press('r');await expect.poll(speed).toBe(0);
  await page.getByLabel('畫質',{exact:true}).selectOption('high');
  const normal=new URL(base);normal.searchParams.delete('quality');await page.goto(normal.href);await dismissDrivingGuide(page);
  await page.getByRole('button',{name:'畫面設定',exact:true}).click();await expect(page.getByLabel('畫質',{exact:true})).toHaveValue('high');
  assert(resources.some(r=>r.url.includes('.hdr')&&r.status===200));assert(resources.some(r=>r.url.includes('lohas_service_van.glb')&&r.status===200));
  assert(resources.some(r=>r.url.includes('lohas_building_reference.glb')&&r.status===200));
  assert.deepEqual(errors,[]);assert.deepEqual(shaderErrors,[]);
  await writeFile('.test-artifacts/rendering/browser-validation.json',JSON.stringify({passed:true,resources,errors,shaderErrors,qualitySwitches:['low','medium','high'],showcaseOrbit:true,capture:true,drivingAfterShowcase:true,preferencePersistence:true},null,2));
  console.log('PASS: HDR/GLB, PBR shaders, live quality, AO/Bloom, showcase/orbit/PNG, pause/restore, driving/braking/reset and persistence.');
}finally{await browser.close();}
