import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import geometry from './serviceVanGeometry.json' with { type: 'json' };
import { disposeModels } from '../assets/GameAssets.ts';
import { CAR_RADIUS } from '../collision/collisionSystem.ts';

export const serviceVanReference = geometry.metadata;
export const serviceVanFile = 'assets/models/lohas_service_van.glb';

export function prepareServiceVan(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  let vertices = 0;
  const point = new THREE.Vector3();
  model.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true; child.receiveShadow = true;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (material.name === 'glass' || child.name.endsWith('-glass')) { material.transparent = true; material.opacity = .25; material.depthWrite = false; }
      if (material.name === 'windshield' || child.name.endsWith('-windshield')) { material.transparent = true; material.opacity = .45; material.depthWrite = false; }
      if(material.transparent)child.castShadow=false;
    }
    const positions = child.geometry.getAttribute('position');
    if (!positions) return;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(child.matrixWorld);
      if (![point.x, point.y, point.z].every(Number.isFinite) || Math.hypot(point.x, point.z) > CAR_RADIUS || point.y < -.001 || point.y > 2.8) {
        throw new Error('Service van exceeds the vehicle collision envelope or ground origin.');
      }
      vertices++;
    }
  });
  if (!vertices) throw new Error('Service van contains no usable geometry.');
  return model;
}

// Generated from the same Blender-authored triangles as the GLB; no network dependency.
export function createServiceVanFallback() {
  const root = new THREE.Group(); root.name = 'lohas-service-van-fallback';
  const fill = (target: THREE.Group, batches: Record<string, { color: string; positions: number[] }>, prefix: string) => { for (const [name, batch] of Object.entries(batches)) {
    if (!batch.positions.length) continue;
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
    shape.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: batch.color, roughness: name === 'mirror' ? .12 : ['glass', 'windshield', 'hub'].includes(name) ? .38 : .76,
      metalness: name === 'mirror' ? .75 : 0, side: name === 'mirror' ? THREE.FrontSide : THREE.DoubleSide });
    const mesh = new THREE.Mesh(shape, material); mesh.name = `${prefix}${name}`; target.add(mesh);
  } };
  fill(root,geometry.batches,'van-');
  const hatch = new THREE.Group(); hatch.name = 'rearHatch'; hatch.position.set(...geometry.hatch.pivot as [number,number,number]);
  fill(hatch,geometry.hatch.batches,'hatch-'); root.add(hatch);
  const door=new THREE.Group();door.name='driverDoor';door.position.set(...geometry.driverDoor.pivot as [number,number,number]);
  fill(door,geometry.driverDoor.batches,'driver-door-');root.add(door);
  const passengerDoor=new THREE.Group();passengerDoor.name='passengerDoor';passengerDoor.position.set(...geometry.passengerDoor.pivot as [number,number,number]);
  fill(passengerDoor,geometry.passengerDoor.batches,'passenger-door-');root.add(passengerDoor);
  return prepareServiceVan(root);
}

type LoadOptions = { signal?: AbortSignal; timeoutMs?: number; load?: (url: string) => Promise<THREE.Object3D> };
export function loadServiceVan(url: string, options: LoadOptions = {}) {
  const loader = new GLTFLoader();
  const load = options.load ?? (path => loader.loadAsync(path).then(gltf => gltf.scene));
  return new Promise<THREE.Object3D>((resolve, reject) => {
    let settled = false;
    const cleanup = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); };
    const fail = (error: unknown) => { if (!settled) { settled = true; cleanup(); reject(error); } };
    const abort = () => fail(new Error('Service van loading cancelled.'));
    const timer = setTimeout(() => fail(new Error('Service van loading timed out.')), options.timeoutMs ?? 8000);
    if (options.signal?.aborted) { abort(); return; }
    options.signal?.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(() => {
      if (settled) throw new Error('Service van loading cancelled.');
      return load(url);
    }).then(model => {
      if (settled) { disposeModels([model]); return; }
      try { prepareServiceVan(model); }
      catch (error) { disposeModels([model]); fail(error); return; }
      settled = true; cleanup(); model.name = 'lohas-service-van-glb'; resolve(model);
    }, fail);
  });
}
