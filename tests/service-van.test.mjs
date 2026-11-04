import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createServiceVanFallback, loadServiceVan, prepareServiceVan, serviceVanReference } from '../src/game/vehicle/serviceVan.ts';
import { disposeModels } from '../src/game/assets/GameAssets.ts';
import { CAR_RADIUS } from '../src/game/collision/collisionSystem.ts';
import { createDriverModel,poseDriver } from '../src/game/vehicle/driverModel.ts';
import { driverPose } from '../src/game/vehicle/driverAssistance.ts';

test('actual Blender GLB matches fallback ground/orientation and fully fits collision envelope', async () => {
  const file = await readFile(new URL('../public/assets/models/lohas_service_van.glb', import.meta.url));
  assert.equal(file.readUInt32LE(0), 0x46546c67);
  const { scene } = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
  prepareServiceVan(scene);
  const fallback = createServiceVanFallback();
  const a = new Box3().setFromObject(scene), b = new Box3().setFromObject(fallback);
  for (const key of ['min','max']) for (const axis of ['x','y','z']) assert.ok(Math.abs(a[key][axis] - b[key][axis]) < .00001);
  assert.ok(a.min.z < -2 && a.max.z > 2 && a.min.y >= .139 && a.max.y < 2.5);
  assert.equal(serviceVanReference.forward, '-Z'); assert.equal(serviceVanReference.up, '+Y');
  assert.equal(serviceVanReference.wheels.length, 4);
  for (const wheel of serviceVanReference.wheels) {
    assert.ok(Math.hypot(Math.abs(wheel.x) + wheel.width/2, Math.abs(wheel.z) + wheel.radius) < CAR_RADIUS);
    assert.ok(Math.abs(wheel.y - wheel.radius - .14) < 1e-6);
  }
  assert.ok(scene.getObjectByName('van-glass')); assert.ok(scene.getObjectByName('van-tire'));
  assert.ok(scene.getObjectByName('van-blue')); assert.ok(scene.getObjectByName('van-pink'));
  assert.ok(scene.getObjectByName('passengerDoor'));assert.ok(fallback.getObjectByName('passengerDoor'));
  // Both front seats must have a real backrest surface above their cushions.
  for (const model of [scene,fallback]) {
    model.updateMatrixWorld(true);
    const ray=new Raycaster();
    for(const x of [-1.215,1.215]){
      ray.set(new Vector3(x,1.76,-.8),new Vector3(0,0,-1));
      const rear=ray.intersectObject(model,true)[0];
      assert.ok(rear?.object.name.endsWith('-mirror'),'mirror surface is visible from the rear');
      assert.ok(rear.face.normal.clone().transformDirection(rear.object.matrixWorld).z>.99,'mirror faces rearward (+Z)');
      assert.equal(rear.object.material.transparent,false,'mirror remains opaque');
      ray.set(new Vector3(x,1.76,-1.8),new Vector3(0,0,1));
      assert.ok(ray.intersectObject(model,true)[0]?.object.name.endsWith('-white'),'white housing is visible from the front');
    }
    for(const x of [-.55,.55])for(const y of [1.10,1.35,1.60]){
      ray.set(new Vector3(x,y,-1.35),new Vector3(0,0,1));
      const hit=ray.intersectObject(model,true)[0];
      assert.ok(hit && hit.point.z>-.85 && hit.point.z<-.60,'front seat has padded backrest behind its occupant');
    }
  }
  disposeModels([scene, fallback]);
});

test('invalid or failed vehicle models reject cleanly and leave independent fallback usable', async () => {
  const fallback = createServiceVanFallback();
  await assert.rejects(loadServiceVan('/missing.glb', { load: async () => { throw new Error('404'); } }), /404/);
  await assert.rejects(loadServiceVan('/empty.glb', { load: async () => new Group() }), /no usable/);
  const oversized = new Mesh(new BoxGeometry(10,10,10), new MeshStandardMaterial());
  let released = 0; oversized.geometry.addEventListener('dispose', () => released++);
  await assert.rejects(loadServiceVan('/bad.glb', { load: async () => oversized }), /collision envelope/);
  assert.equal(released, 1); assert.equal(prepareServiceVan(fallback), fallback); disposeModels([fallback]);
});

test('driver head stays behind the enlarged windshield and the front opening contains only translucent glass',async()=>{
  const bytes=await readFile(new URL('../public/assets/models/lohas_service_van.glb',import.meta.url));
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const fallback=createServiceVanFallback(),driver=createDriverModel(),pose=driverPose('stowed');
  poseDriver(driver,pose,0);driver.root.position.set(pose.x,pose.y,pose.z);driver.root.rotation.y=pose.yaw;driver.root.updateMatrixWorld(true);
  for(const van of [prepareServiceVan(scene),fallback]){
    const glass=van.getObjectByName('van-windshield');assert.ok(glass);
    assert.equal(glass.material.transparent,true);assert.equal(glass.material.opacity,.45);assert.equal(glass.material.depthWrite,false);
    const box=new Box3().setFromObject(glass),point=new Vector3();let headVertices=0;
    driver.torso.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const positions=mesh.geometry.getAttribute('position');
      for(let i=0;i<positions.count;i++){
        point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
        if(point.y<1.75)continue;
        const planeZ=box.min.z+(point.y-box.min.y)*(box.max.z-box.min.z)/(box.max.y-box.min.y);
        assert.ok(point.z-planeZ>.12,'head and cap need real clearance behind the glass');
        assert.ok(point.y<2.35 && Math.abs(point.x)<1.02);headVertices++;
      }
    });assert.ok(headVertices>0);
    // An opaque white polygon behind the glass would hide the enlarged cab.
    const ray=new Raycaster(new Vector3(-.55,2.0,-4),new Vector3(0,0,1));
    const hits=ray.intersectObject(van,true);assert.ok(hits.length);
    assert.equal(hits[0].object.name,'van-windshield');
    assert.ok(!hits.some(hit=>hit.distance<3 && !hit.object.material.transparent),'no opaque shell in front of the driver');
  }
  disposeModels([scene,fallback,driver.root]);
});

test('vehicle preload times out or aborts and disposes results that arrive after unmount', async () => {
  for (const mode of ['timeout', 'abort']) {
    let complete;
    const controller = new AbortController();
    const pending = loadServiceVan('/slow.glb', { signal: controller.signal, timeoutMs: 10,
      load: () => new Promise(resolve => { complete = resolve; }) });
    await Promise.resolve();
    if (mode === 'abort') controller.abort();
    await assert.rejects(pending, mode === 'abort' ? /cancelled/ : /timed out/);
    const late = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    let released = 0; late.geometry.addEventListener('dispose', () => released++); complete(late);
    await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(released, 1);
  }
});
