import assert from 'node:assert/strict';

// A locally generated binary glTF triangle tests the real loader without third-party assets.
function fixtureGLB() {
  const data = Buffer.from(new Float32Array([-1, 0, 0, 1, 0, 0, 0, 2, 0]).buffer);
  const json = JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: data.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: data.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-1, 0, 0], max: [1, 2, 0] }] });
  const jsonChunk = Buffer.from(json.padEnd(Math.ceil(json.length / 4) * 4, ' '));
  const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonChunk.length + data.length, 8); header.writeUInt32LE(jsonChunk.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(data.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonChunk, binHeader, data]);
}

export async function testModelAssets(browser, baseURL) {
  const page = await browser.newPage(), errors = [], requested = new Set();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/assets/models/*.glb', async route => {
    requested.add(new URL(route.request().url()).pathname.split('/').at(-1));
    await route.fulfill({ contentType: 'model/gltf-binary', body: fixtureGLB() });
  });
  await page.goto(baseURL); await page.locator('canvas').waitFor();
  await page.waitForTimeout(1200);
  assert.equal(requested.size, 4, 'app preloads all four models');
  const status = await page.evaluate(async moduleURL => {
    const { GameAssets } = await import(moduleURL);
    const assets = new GameAssets({ base: './' }); await assets.loadGameAssets();
    const states = Object.values(assets.status).map(item => item.state);
    const clones = Object.keys(assets.status).map(key => assets.create(key));
    const shadows = clones.every(root => { let meshCount = 0; root.traverse(child => { if (child.isMesh && child.castShadow && child.receiveShadow) meshCount++; }); return meshCount > 0; });
    clones.forEach(root => assets.releaseInstance(root)); assets.dispose();
    return { states, shadows };
  }, new URL('src/game/assets/GameAssets.ts', baseURL).href);
  assert.deepEqual(status.states, ['ready', 'ready', 'ready', 'ready']); assert.equal(status.shadows, true);
  await page.keyboard.down('w'); await page.waitForTimeout(2200); await page.keyboard.up('w');
  assert.ok(Number(await page.locator('.speed-panel strong').innerText()) > 0, 'loaded-model scene remains drivable across chunk boundary');
  await page.keyboard.press('r'); await page.waitForTimeout(300);
  assert.equal(Number(await page.locator('.speed-panel strong').innerText()), 0);
  assert.deepEqual(errors, []); await page.close();
  console.log('PASS: Four binary GLTF fixtures load in Chrome; shared clones, shadows, chunk driving and reset.');
}
