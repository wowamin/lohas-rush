import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Mesh, MeshStandardMaterial, Group, Box3, Vector3 } from 'three';
import { GameAssets } from '../src/game/assets/GameAssets.ts';
import { TrackManager } from '../src/game/assets/TrackManager.ts';
import { modelUrl, assetKeys } from '../src/game/assets/modelManifest.ts';

const cube = () => new Mesh(new BoxGeometry(2, 2, 2), new MeshStandardMaterial());
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
