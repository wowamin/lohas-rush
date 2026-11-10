import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(out, '../../..');
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const audit = JSON.parse(await readFile(path.join(out, 'model_analysis.json'), 'utf8'));
const metrics = JSON.parse(await readFile(path.join(out, 'refinement_metrics.json'), 'utf8'));
assert.equal(hash(await readFile(path.join(root, 'world.glb'))), audit.source.sha256_before);
assert.equal(hash(await readFile(path.join(root, audit.references[0].path))), audit.references[0].sha256);

function glb(buffer) {
  assert.equal(buffer.toString('utf8', 0, 4), 'glTF');
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  assert.equal(buffer.readUInt32LE(24 + jsonLength), 0x004e4942);
  return { json, binary: buffer.subarray(28 + jsonLength) };
}

function accessorBytes(g, i) {
  const a = g.json.accessors[i];
  assert(!a.sparse, 'Unexpected sparse accessor');
  const v = g.json.bufferViews[a.bufferView];
  const elements = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const bytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
  assert(elements && bytes);
  const size = elements * bytes;
  const start = (v.byteOffset || 0) + (a.byteOffset || 0);
  assert(start + (a.count - 1) * (v.byteStride || size) + size <= g.binary.length);
  const result = Buffer.alloc(a.count * size);
  for (let k = 0; k < a.count; k++) g.binary.copy(result, k * size, start + k * (v.byteStride || size), start + k * (v.byteStride || size) + size);
  if (a.componentType === 5126) for (let k = 0; k < result.length; k += 4) assert(Number.isFinite(result.readFloatLE(k)));
  return result;
}

function snapshot(g) {
  const entries = new Map();
  const parents = new Map();
  for (const parent of g.json.nodes) for (const child of parent.children || []) parents.set(child, parent.extras?.canonical_name || parent.name);
  for (const node of g.json.nodes) {
    if (node.mesh === undefined || node.extras?.asset_role === 'vegetation') continue;
    const mesh = g.json.meshes[node.mesh];
    const key = node.extras?.canonical_name || node.name;
    const primitives = mesh.primitives.map(p => ({
      attributes: Object.fromEntries(Object.entries(p.attributes).filter(([name]) => !name.startsWith('TEXCOORD_') && name !== 'TANGENT').sort().map(([name, i]) => [name, hash(accessorBytes(g, i))])),
      indices: p.indices === undefined ? null : hash(accessorBytes(g, p.indices)),
      material: g.json.materials[p.material]?.name,
    }));
    entries.set(key, { primitives, parent: parents.get(g.json.nodes.indexOf(node)), translation: node.translation, rotation: node.rotation, scale: node.scale, matrix: node.matrix });
  }
  return entries;
}

function compareShadingPrecision(base, other) {
  const maxima = { uv: 0, tangent: 0 };
  for (const node of base.json.nodes) {
    if (node.mesh === undefined || node.extras?.asset_role === 'vegetation') continue;
    const name = node.extras?.canonical_name || node.name;
    const paired = other.json.nodes.find(n => (n.extras?.canonical_name || n.name) === name);
    assert(paired, name);
    base.json.meshes[node.mesh].primitives.forEach((p, index) => {
      const q = other.json.meshes[paired.mesh].primitives[index];
      assert.deepEqual(Object.keys(p.attributes).sort(), Object.keys(q.attributes).sort());
      for (const key of Object.keys(p.attributes).filter(k => k.startsWith('TEXCOORD_') || k === 'TANGENT')) {
        const a = accessorBytes(base, p.attributes[key]), b = accessorBytes(other, q.attributes[key]);
        assert.equal(a.length, b.length);
        let error = 0;
        for (let i = 0; i < a.length; i += 4) error = Math.max(error, Math.abs(a.readFloatLE(i) - b.readFloatLE(i)));
        const kind = key === 'TANGENT' ? 'tangent' : 'uv';
        maxima[kind] = Math.max(maxima[kind], error);
        // Live Blender Boolean interpolation can differ by a few float ULPs
        // between scene evaluations, while positions/normals/indices stay exact.
        assert(error < (kind === 'uv' ? 0.00001 : 0.001), `${name} ${key}: ${error}`);
      }
    });
  }
  return maxima;
}

const results = [];
let architecture;
let firstAsset;
for (const record of metrics.exports) {
  const buffer = await readFile(path.join(out, record.file));
  assert.equal(hash(buffer), record.sha256);
  const g = glb(buffer);
  const j = g.json;
  assert.equal(j.scenes.length, 1, 'Runtime export must contain only its selected LOD scene');
  assert(!j.scenes[0].name.includes('Original'));
  assert(!j.nodes.some(n => n.name?.startsWith('CUT_')));
  assert(!j.nodes.some(n => n.extras?.asset_role === 'reference_image_plane'));
  assert(!j.images.some(i => i.name === 'Image_2'));
  assert(!j.buffers.some(b => b.uri));
  assert(!j.images.some(i => i.uri));
  assert(!j.extensionsRequired?.includes('KHR_draco_mesh_compression'));
  for (let i = 0; i < j.accessors.length; i++) accessorBytes(g, i);
  let triangles = 0;
  for (const n of j.nodes.filter(n => n.mesh !== undefined)) {
    for (const p of j.meshes[n.mesh].primitives) {
      assert.equal(p.mode ?? 4, 4);
      const a = j.accessors[p.indices ?? p.attributes.POSITION];
      assert.equal(a.count % 3, 0);
      triangles += a.count / 3;
      const indices = accessorBytes(g, p.indices);
      const count = j.accessors[p.attributes.POSITION].count;
      const read = a.componentType === 5125 ? 'readUInt32LE' : a.componentType === 5123 ? 'readUInt16LE' : 'readUInt8';
      const step = a.componentType === 5125 ? 4 : a.componentType === 5123 ? 2 : 1;
      for (let i = 0; i < indices.length; i += step) assert(indices[read](i) < count);
    }
  }
  assert.equal(triangles, record.triangles_evaluated);
  assert.equal(j.materials.length, record.exported_materials);
  const snap = snapshot(g);
  let shadingPrecision;
  if (architecture) {
    assert.deepEqual(snap, architecture, 'Architecture positions, normals, indices, materials or hierarchy changed across LOD levels');
    shadingPrecision = compareShadingPrecision(firstAsset, g);
  } else { architecture = snap; firstAsset = g; }
  const images = j.images.map(i => {
    const v = j.bufferViews[i.bufferView];
    const bytes = g.binary.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    return { name: i.name, mime: i.mimeType, bytes: bytes.length,
      pngSize: i.mimeType === 'image/png' ? [bytes.readUInt32BE(16), bytes.readUInt32BE(20)] : undefined };
  });
  results.push({ file: record.file, bytes: buffer.length, triangles, materials: j.materials.length,
    meshNodes: j.nodes.filter(n => n.mesh !== undefined).length, uniqueMeshes: j.meshes.length,
    scenes: j.scenes.map(s => s.name), images, extensionsUsed: j.extensionsUsed || [],
    requiredExtensions: j.extensionsRequired || [], architectureIdenticalAcrossLODs: true, shadingPrecision });
}

const basePath = '/' + path.relative(root, out).split(path.sep).join('/');
const html = `<!doctype html><meta charset="utf-8"><title>Refined building asset validation</title>
<style>body{margin:0;background:#c6cbd2}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadRefinedBuilding } from '${basePath}/load-building.mjs';
try {
  const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(1400,1100); renderer.setPixelRatio(1);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  document.body.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#c6cbd2');
  const environment=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);
  const env=pmrem.fromScene(environment);scene.environment=env.texture;
  const sun=new THREE.DirectionalLight(0xffffff,2.7);sun.position.set(-3,10,9);scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xe1efff,0x8c8276,1.3));
  const camera=new THREE.OrthographicCamera(-5.2,5.2,4.09,-4.09,.1,100);
  camera.position.set(11,8.2,15);camera.lookAt(.8,2.3,-.5);
  const loader=new GLTFLoader();const loaded=[];
  for(const file of ['building_refined.glb','building_refined_lod1.glb','building_refined_lod2.glb']) {
    const asset=await loader.loadAsync('${basePath}/'+file);
    let meshes=0,triangles=0,textures=new Set();
    asset.scene.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
      for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m))if(v?.isTexture)textures.add(v);});
    loaded.push({file,meshes,triangles,textures:textures.size});
    if(file==='building_refined.glb') {
      asset.scene.traverse(o=>{if(['vegetation','vehicle','context_mass_unconfirmed','street_light','traffic_cone'].includes(o.userData.asset_role))o.visible=false;});
      scene.add(asset.scene);
    }
  }
  const lod=await loadRefinedBuilding({baseUrl:new URL('${basePath}/',location.origin)});
  const switches=[];
  for(const distance of [1,30,75]){const testCamera=new THREE.PerspectiveCamera();testCamera.position.set(0,0,distance);testCamera.updateMatrixWorld();lod.updateMatrixWorld();lod.update(testCamera);switches.push(lod.levels.findIndex(l=>l.object.visible));}
  if(JSON.stringify(switches)!=='[0,1,2]')throw new Error('LOD switching failed: '+JSON.stringify(switches));
  lod.dispose();
  renderer.render(scene,camera);await new Promise(r=>requestAnimationFrame(r));renderer.render(scene,camera);
  window.validation={loaded,lodSwitches:switches,drawCalls:renderer.info.render.calls,webgl:renderer.capabilities.isWebGL2?'WebGL2':'WebGL',threeRevision:THREE.REVISION};
}catch(error){window.validationError=error.stack||String(error);}
</script>`;

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/asset-validation') { res.setHeader('Content-Type', 'text/html');res.end(html);return; }
    if (req.url === '/favicon.ico') {res.writeHead(204);res.end();return;}
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const full = path.resolve(root, '.' + requested);
    if (!full.startsWith(root + path.sep)) throw new Error('Invalid path');
    const type = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png' }[path.extname(full)];
    if (!type) throw new Error('Unsupported file');
    const bytes = await readFile(full);res.setHeader('Content-Type', type);res.end(bytes);
  } catch { res.writeHead(404);res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/asset-validation`);
  await page.waitForFunction(() => window.validation || window.validationError, { timeout: 120000 });
  const error = await page.evaluate(() => window.validationError);
  assert(!error, error);
  const browserResult = await page.evaluate(() => window.validation);
  assert.deepEqual(browserResult.loaded.map(x => x.triangles), metrics.exports.map(x => x.triangles_evaluated));
  assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(out, 'threejs_validation.png') });
  const report = { passed: true, sourceHashUnchanged: true, referencePhotoUnchanged: true,
    architectureComparisonObjects: architecture.size, assets: results, browser: browserResult, browserErrors: errors };
  await writeFile(path.join(out, 'validation_report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, assets: results.map(({ file, bytes, triangles, materials }) => ({ file, bytes, triangles, materials })), browser: browserResult }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
