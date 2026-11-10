import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BoxGeometry, Mesh, MeshStandardMaterial, Group, Box3, Vector3 } from 'three';
import { GameAssets } from '../src/game/assets/GameAssets.ts';
import { TrackManager } from '../src/game/assets/TrackManager.ts';
import { modelUrl, assetKeys } from '../src/game/assets/modelManifest.ts';
import { buildings } from '../src/data/city.ts';

const cube = () => new Mesh(new BoxGeometry(2, 2, 2), new MeshStandardMaterial());
test('headquarters reference is the supplied Z-up GLB and its collision footprint matches its proportions', async () => {
  const bytes = await readFile(new URL('../public/lohas_building_reference.glb', import.meta.url));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  assert.ok(gltf.nodes.some(node => node.name === 'main_white_3storey'));
  assert.ok(gltf.nodes.some(node => node.name === 'tower_four_storey'));

  const positions = gltf.meshes.map(mesh => gltf.accessors[mesh.primitives[0].attributes.POSITION]);
  const bounds = [0, 1, 2].map(axis => [
    Math.min(...positions.map(attribute => attribute.min[axis])),
    Math.max(...positions.map(attribute => attribute.max[axis])),
  ]);
  const headquarters = buildings.find(building => building.id === 'headquarters');
  assert.ok(headquarters);
  const width = bounds[0][1] - bounds[0][0];
  const depth = bounds[1][1] - bounds[1][0];
  assert.ok(Math.abs((headquarters.halfX / headquarters.halfZ) / (width / depth) - 1) < 1e-4);
  assert.ok(Math.abs((headquarters.halfX * 2 * headquarters.halfZ * 2) / 100 - 1.3) < 1e-12);
});

test('optional assets load once, honor deployment base and fit shadow-enabled clones', async () => {
  const urls = [], sources = [];
  const assets = new GameAssets({ base: '/lohas-rush/', load: async url => { urls.push(url); const mesh = cube(); sources.push(mesh); return mesh; } });
  const pending = assets.loadGameAssets(); assert.equal(assets.loadGameAssets(), pending); await pending;
  assert.deepEqual(urls, assetKeys.map(key => modelUrl(key, '/lohas-rush/')));
  assert.ok(sources.every(mesh => mesh.castShadow && mesh.receiveShadow));
  const instance = assets.create('shophouse', { width: 9, height: 6, depth: 9 });
  instance.updateMatrixWorld(true); const bounds = new Box3().setFromObject(instance);
  assert.equal(bounds.min.y, 0); assert.deepEqual(bounds.getSize(new Vector3()).toArray(), [6, 6, 6]);
  let disposed = 0; sources[3].geometry.addEventListener('dispose', () => disposed++);
  assets.releaseInstance(instance); assert.equal(disposed, 0, 'clones share cache resources');
  assets.dispose(); assets.dispose(); assert.equal(disposed, 1);
});

test('missing, empty, timed-out and late assets retain usable fallbacks', async () => {
  let complete, lateDisposed = 0;
  const late = cube(); late.geometry.addEventListener('dispose', () => lateDisposed++);
  const assets = new GameAssets({ timeoutMs: 10, load: async url => {
    if (url.includes('scooter')) throw new Error('404');
    if (url.includes('shophouse')) return new Group();
    return new Promise(resolve => { if (url.includes('blue_truck')) complete = resolve; });
  } });
  await assets.loadGameAssets();
  for (const key of assetKeys) { assert.equal(assets.status[key].state, 'fallback'); assert.ok(!new Box3().setFromObject(assets.create(key)).isEmpty()); }
  complete(late); await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(lateDisposed, 1);
  assets.dispose();
});

test('unmount settles pending preload immediately and releases late results', async () => {
  const resolves = [], sources = [];
  const assets = new GameAssets({ load: () => new Promise(resolve => resolves.push(resolve)) });
  const loading = assets.loadGameAssets(); await Promise.resolve(); assets.dispose(); await loading;
  let count = 0;
  for (const resolve of resolves) { const source = cube(); sources.push(source); source.geometry.addEventListener('dispose', () => count++); resolve(source); }
  await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(count, 4);
  assert.throws(() => assets.create('scooter'), /disposed/);
});

test('four pooled 2D chunks handle reversal, jumps, loaded-shop replacement and resource ownership', async () => {
  const assets = new GameAssets({ load: async () => cube() }), scene = new Group();
  let shops;
  const track = new TrackManager(scene, assets, [
    { id: 'truck', asset: 'blueTruck', x: 25, z: 25 },
    { id: 'shop', shopId: 'shop', asset: 'shophouse', x: -25, z: -25 },
    { id: 'far', asset: 'scooter', x: 1000, z: -1000 },
  ], ids => { shops = ids; });
  track.init(); track.init(); const pool = [...track.chunks];
  assert.equal(scene.children.length, 4); assert.equal(shops.size, 0);
  await assets.loadGameAssets(); track.refreshAssets(); assert.ok(shops.has('shop'));
  assert.ok(track.chunks.some(group => group.children.some(child => child.name === 'truck')));
  track.update(1000, -1000); assert.equal(shops.size, 0);
  assert.ok(track.chunks.some(group => group.children.some(child => child.name === 'far')));
  track.update(-25, -25); assert.ok(shops.has('shop')); assert.deepEqual(track.chunks, pool);
  const before = track.chunks.map(group => group.children.slice()); track.update(-25, -25);
  assert.deepEqual(track.chunks.map(group => group.children), before, 'no rebuild within same neighborhood');
  track.dispose(); track.dispose(); assert.equal(scene.children.length, 0); assets.dispose();
});

test('5000 neighborhood changes reuse the same bounded model instances without new loads or clones', async () => {
  let requests = 0, sharedDisposed = 0;
  const assets = new GameAssets({ load: async () => {
    requests++; const mesh = cube(); mesh.geometry.addEventListener('dispose', () => sharedDisposed++); return mesh;
  } });
  await assets.loadGameAssets();
  const created = [], create = assets.create.bind(assets);
  assets.create = (...args) => { const model = create(...args); created.push(model); return model; };
  const placements = [];
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) for (let i = 0; i < 3; i++) {
    placements.push({ id: `${x},${z},${i}`, shopId: `${x},${z},${i}`, asset: 'shophouse',
      x: x*40+8+i*8, z: z*40+10, rotation: (i-1)*Math.PI/2,
      size: { width: 9, height: 5+i, depth: 9 } });
  }
  const scene = new Group(), track = new TrackManager(scene, assets, placements);
  track.init(); const warmCount = created.length, reserved = new Set(created);
  assert.equal(warmCount, track.poolStats.capacity);
  for (let i = 0; i < 5000; i++) {
    track.update(((i*3)%11-5)*40, ((i*7)%11-5)*40);
    assert.equal(scene.children.length, 4);
    for (const group of track.chunks) for (const model of group.children) {
      assert.ok(reserved.has(model), 'moves preserve model identity');
      const source = placements.find(item => item.id === model.name);
      assert.ok(source); assert.deepEqual(model.position.toArray(), [source.x,.1,source.z]);
      assert.equal(model.rotation.y, source.rotation); assert.equal(model.userData.shopId, source.shopId);
    }
    assert.equal(track.poolStats.resident, warmCount);
  }
  for (let i = 0; i < 20; i++) track.refreshAssets();
  assert.equal(created.length, warmCount, 'refreshing unchanged templates does not allocate');
  assert.equal(requests, 4, 'world traversal never downloads models again');
  assert.equal(sharedDisposed, 0); track.dispose(); assert.equal(track.poolStats.resident, 0);
  assert.equal(sharedDisposed, 0, 'pool does not dispose cached geometry');
  assets.dispose(); assert.equal(sharedDisposed, 4);
});

test('pool replaces obsolete fallback instances once after preload, including reset and reverse revisits', async () => {
  const assets = new GameAssets({ load: async () => cube() }), scene = new Group();
  const track = new TrackManager(scene, assets, [
    { id: 'near', asset: 'blueTruck', x: 25, z: 25 }, { id: 'far', asset: 'blueTruck', x: -85, z: -85 },
  ]);
  track.init(); const old = track.chunks.flatMap(group => group.children)[0];
  assert.equal(old.userData.modelState, 'idle');
  await assets.loadGameAssets(); track.refreshAssets();
  const ready = track.chunks.flatMap(group => group.children)[0];
  assert.notEqual(ready, old); assert.equal(ready.userData.modelState, 'ready');
  const count = track.poolStats.created;
  for (let i = 0; i < 100; i++) { track.update(-85,-85); track.update(0,0); track.refreshAssets(); }
  assert.equal(track.poolStats.created, count);
  assert.equal(track.poolStats.resident, track.poolStats.capacity);
  track.dispose(); assets.dispose();
});

test('missing shop models retain base-city geometry without allocating substitute shop clones', async () => {
  const assets = new GameAssets({ load: async () => { throw new Error('404'); } });
  await assets.loadGameAssets();
  let hidden;
  const track = new TrackManager(new Group(), assets, [{ id:'shop', shopId:'shop', asset:'shophouse', x:0, z:0 }], ids => { hidden = ids; });
  track.init();
  assert.equal(track.poolStats.resident, 0); assert.equal(hidden.size, 0);
  track.dispose(); track.update(0,0); track.refreshAssets(); assert.equal(track.poolStats.resident, 0); assets.dispose();
});
