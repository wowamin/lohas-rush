import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
await mkdir('.test-artifacts', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/');
  await expect.poll(() => page.evaluate(async () => {
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    return !!_roots.get(document.querySelector('canvas'))?.store.getState().scene.getObjectByName('driver-character');
  })).toBe(true);
  const summary = await page.evaluate(async () => {
    const T = await import('/node_modules/.vite/deps/three.js');
    const { createChairpersonModel } = await import('/src/game/characters/chairpersonModel.ts');
    const { createDriverModel } = await import('/src/game/vehicle/driverModel.ts');
    const { createCaregiverModel, poseCaregiver } = await import('/src/game/vehicle/caregiverModel.ts');
    const { createPassengerModel } = await import('/src/game/vehicle/passengerModels.ts');
    const { disposeModels } = await import('/src/game/assets/GameAssets.ts');
    const chairperson = createChairpersonModel(), driver = createDriverModel(), caregiver = createCaregiverModel();
    poseCaregiver(caregiver, 0, 0, 0);
    const models = [chairperson.root, driver.root, caregiver.root, createPassengerModel('grandma'), createPassengerModel('grandpa')];
    const scene = new T.Scene(); scene.background = new T.Color('#edf0eb');
    scene.add(new T.HemisphereLight('#fff7ed', '#a7b1ab', 2));
    const key = new T.DirectionalLight('#fff4e6', 2.5); key.position.set(-3, 6, 5);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 4, bottom: -4, near: .1, far: 20 });
    key.shadow.normalBias = .025; scene.add(key);
    const fill = new T.DirectionalLight('#e8f2ff', 1); fill.position.set(5, 3, -3); scene.add(fill);
    const floor = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshStandardMaterial({ color: '#edf0eb', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.06; floor.receiveShadow = true; scene.add(floor);
    const stats = [];
    models.forEach((model, i) => {
      const box = new T.Box3().setFromObject(model); let triangles = 0, meshes = 0;
      model.traverse(node => { if (node.isMesh) { meshes++; triangles += node.geometry.getAttribute('position').count / 3; } });
      stats.push({ name: model.name, meshes, triangles, height: box.max.y - box.min.y });
      model.position.set((i - 2) * 1.52, -box.min.y, 0); scene.add(model);
    });
    const camera = new T.OrthographicCamera(-4.3, 4.3, 2.15, -2.15, .1, 50);
    camera.position.set(0, 3, 12); camera.lookAt(0, .83, 0);
    const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(1800, 900);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.id = 'character-review';
    renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:99999;width:1800px;height:900px';
    document.body.appendChild(renderer.domElement); renderer.render(scene, camera);
    window.characterReview = {
      back: () => { models.forEach(model => model.rotation.y = Math.PI); renderer.render(scene, camera); },
      dispose: () => { disposeModels([...models, floor]); renderer.dispose(); renderer.domElement.remove(); }
    };
    return stats;
  });
  for (const model of summary) {
    assert.ok(model.meshes < 50, `${model.name} uses merged materials`);
    assert.ok(model.height > 1.2 && model.height < 2, `${model.name} retains its gameplay scale`);
    assert.ok(Number.isFinite(model.triangles));
  }
  await page.locator('#character-review').screenshot({ path: '.test-artifacts/all-characters-front.png' });
  await page.evaluate(() => window.characterReview.back());
  await page.locator('#character-review').screenshot({ path: '.test-artifacts/all-characters-back.png' });
  await page.evaluate(() => window.characterReview.dispose());
  assert.deepEqual(errors, []);
  console.log('PASS: all five characters render front/back without runtime errors.');
  console.log(JSON.stringify(summary));
} finally { await browser.close(); }
