import test from 'node:test';
import assert from 'node:assert/strict';
import { createVehicle, interpolateVehicle, stepVehicle, MAX_FORWARD_SPEED } from '../src/game/vehicle/drivingPhysics.ts';
import { collides, CAR_RADIUS } from '../src/game/collision/collisionSystem.ts';
import { hasArrived } from '../src/game/missions/missionSystem.ts';
import { locations, obstacles, CITY_LIMIT } from '../src/data/city.ts';
import { useGame } from '../src/stores/game.ts';
import { TouchController } from '../src/game/vehicle/touchController.ts';
import { SPAWN, roads, nodeById, roadNodes, findRoadRoute, cityBlocks, streetDistricts, streetJunctions } from '../src/data/roadNetwork.ts';
import { servicePoints } from '../src/data/services.ts';
import { river } from '../src/data/landscape.ts';
import { generateCity } from '../src/data/cityGenerator.ts';
import { generatedCity, spawnPoints, centerIds, shopPrefabs, CITY_SEED, CITY_GENERATION_RULES } from '../src/data/buildingLots.ts';
import { centerDistrictIds } from '../src/data/streetGrid.ts';
import { buildings } from '../src/data/city.ts';
import { CameraBrain } from '../src/game/camera/CameraBrain.ts';
import { selectVirtualCamera } from '../src/game/camera/virtualCameras.ts';
import { constrainCamera } from '../src/game/camera/cameraCollision.ts';

const idle = { throttle: 0, steer: 0, brake: false };

test('expanded city adds exactly thirty percent area and keeps all outer roads reachable and clear',()=>{
  assert.ok(Math.abs((CITY_LIMIT/448)**2-1.30)<1e-12);
  const homes=buildings.filter(b=>b.id.startsWith('expansion-home-'));
  assert.equal(homes.length,32);
  for(const b of homes){
    assert.ok(Math.abs(b.x)>448 || Math.abs(b.z)>448);
    assert.ok(Math.abs(b.x)+b.halfX+2<CITY_LIMIT && Math.abs(b.z)+b.halfZ+2<CITY_LIMIT);
  }
  const nodes=roadNodes.filter(n=>n.id.startsWith('expansion-'));
  assert.ok(nodes.length>10);
  for(const node of nodes){assert.equal(collides(...node.point),false);assert.ok(findRoadRoute('0-0',node.id).length>1);}
  assert.deepEqual(locations.map(l=>l.position),[[-260,0,-180],[-324,0,212],[-16,0,340],[324,0,244],[356,0,-180]]);
  const daihe = buildings.find(building => building.id === 'daihe');
  assert.ok(daihe);
  assert.deepEqual([daihe.halfX, daihe.halfZ, daihe.height], [7, 6, 13]);
  const annan = buildings.find(building => building.id === 'annan');
  assert.ok(annan);
  assert.deepEqual([annan.halfX, annan.halfZ, annan.height], [6, 7, 9.2]);
  const xinying = buildings.find(building => building.id === 'xinying');
  assert.ok(xinying);
  assert.deepEqual([xinying.halfX, xinying.halfZ, xinying.height], [7, 7, 27.6]);
  const [daiheX, , daiheZ] = daihe.location.position;
  for (const road of roads) {
    const a = nodeById.get(road.from).point, b = nodeById.get(road.to).point;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((daiheX - a[0]) * dx + (daiheZ - a[1]) * dz) / (dx * dx + dz * dz)));
    assert.ok(Math.hypot(daiheX - a[0] - t * dx, daiheZ - a[1] - t * dz) > Math.hypot(daihe.halfX, daihe.halfZ) + road.width / 2, `Daihe building clears ${road.kind} road`);
  }
  const [annanX, , annanZ] = annan.location.position;
  for (const road of roads) {
    const a = nodeById.get(road.from).point, b = nodeById.get(road.to).point;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((annanX - a[0]) * dx + (annanZ - a[1]) * dz) / (dx * dx + dz * dz)));
    assert.ok(Math.hypot(annanX - a[0] - t * dx, annanZ - a[1] - t * dz) > Math.hypot(annan.halfX, annan.halfZ) + road.width / 2, `Annan building clears ${road.kind} road`);
  }
  const [xinyingX, , xinyingZ] = xinying.location.position;
  for (const road of roads) {
    const a = nodeById.get(road.from).point, b = nodeById.get(road.to).point;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((xinyingX - a[0]) * dx + (xinyingZ - a[1]) * dz) / (dx * dx + dz * dz)));
    assert.ok(Math.hypot(xinyingX - a[0] - t * dx, xinyingZ - a[1] - t * dz) > Math.hypot(xinying.halfX, xinying.halfZ) + road.width / 2, `Xinying building clears ${road.kind} road`);
  }
  assert.deepEqual(river.bridgeCenters,[-480,0,260,480]);
});

test('virtual camera follows target heading, selects priority and cuts directly on reset', () => {
  const brain = new CameraBrain();
  brain.reset(createVehicle());
  assert.deepEqual(brain.position.toArray(), [SPAWN.x, 9, SPAWN.z + 14]);
  assert.deepEqual(brain.lookAt.toArray(), [SPAWN.x, 1.2, SPAWN.z - 3]);
  assert.equal(brain.fov, 58);
  const target = { x: 10, z: 20, angle: Math.PI / 2, speed: 0 };
  brain.reset(target, 'overview');
  assert.equal(selectVirtualCamera('overview').priority, 20);
  assert.ok(Math.abs(brain.position.x - 32) < 1e-10 && Math.abs(brain.position.z - 20) < 1e-10);
  assert.equal(brain.position.y, 17);
  brain.reset(createVehicle());
  assert.deepEqual(brain.position.toArray(), [SPAWN.x, 9, SPAWN.z + 14]);
  assert.equal(brain.activeId, 'chase');
  assert.equal(brain.fov, 58);
});

test('camera damping is stable across 30/60/144 Hz without modifying vehicle state', () => {
  const target = { ...createVehicle(), x: 10 };
  const snapshot = { ...target }, outputs = [];
  for (const fps of [30, 60, 144]) {
    const brain = new CameraBrain(); brain.reset(createVehicle());
    for (let i = 0; i < fps; i++) brain.update(target, 1 / fps, 'chase');
    outputs.push([...brain.position.toArray(), ...brain.lookAt.toArray()]);
  }
  for (const output of outputs) for (let i = 0; i < output.length; i++) assert.ok(Math.abs(output[i] - outputs[0][i]) < 1e-9);
  assert.deepEqual(target, snapshot);
});

test('virtual camera blending stays continuous on repeated changes and reaches its lens setting', () => {
  const target = createVehicle(), brain = new CameraBrain(); brain.reset(target);
  for (let i = 0; i < 18; i++) brain.update(target, 1 / 60, 'overview');
  assert.ok(brain.fov > 58 && brain.fov < 62);
  const before = [...brain.position.toArray(), brain.fov];
  brain.update(target, 0, 'chase');
  assert.deepEqual([...brain.position.toArray(), brain.fov], before, 'switch does not jump');
  for (let i = 0; i < 60; i++) brain.update(target, 1 / 60, 'chase');
  assert.equal(brain.fov, 58);
  for (let i = 0; i < 60; i++) brain.update(target, 1 / 60, 'overview');
  assert.equal(brain.fov, 62);
  assert.ok(brain.position.y > 16 && brain.position.z > SPAWN.z + 21);
});

test('camera volume stops at the nearest building, respects height and recovers smoothly', () => {
  const wall = { min: { x: -4, y: 0, z: 6 }, max: { x: 4, y: 20, z: 8 } };
  const focus = { x: 0, y: 1.8, z: 0 }, position = { x: 0, y: 9, z: 14 };
  const farther = { min: { x: -4, y: 0, z: 11 }, max: { x: 4, y: 20, z: 12 } };
  assert.equal(constrainCamera(focus, position, [farther, wall]), true);
  assert.ok(position.z > 5 && position.z < 5.6);
  const above = { x: 0, y: 25, z: 14 };
  assert.equal(constrainCamera({ x: 0, y: 25, z: 0 }, above, [wall]), false);
  assert.deepEqual(above, { x: 0, y: 25, z: 14 });
  const brain = new CameraBrain(), target = { x: 0, z: 0, angle: 0, speed: 0 };
  brain.reset(target); brain.update(target, 0, 'chase', [wall]);
  assert.ok(brain.position.z < 5.6);
  const clipped = brain.position.z;
  brain.update(target, 1 / 60, 'chase');
  assert.ok(brain.position.z > clipped && brain.position.z < 14, 'clearance recovery is damped');
  for (let i = 0; i < 120; i++) brain.update(target, 1 / 60, 'chase');
  assert.ok(brain.position.z > 13.9);
});

test('camera mode is low-frequency state and restart restores chase without changing mission', () => {
  useGame.getState().reset();
  useGame.getState().cycleCamera();
  assert.equal(useGame.getState().cameraMode, 'overview');
  assert.equal(useGame.getState().missionIndex, 0);
  useGame.getState().reset();
  assert.equal(useGame.getState().cameraMode, 'chase');
});

test('seeded generation reserves every center exactly once and fills remaining unique lots without mutating input', () => {
  const options = { spawnPoints, normalShops: shopPrefabs.map(p => p.id), sunCareCenters: centerIds, seed: CITY_SEED, ...CITY_GENERATION_RULES };
  const snapshot = JSON.stringify(options);
  const generated = generateCity(options);
  assert.deepEqual(generated.centers.map(item => item.prefab), centerIds);
  assert.equal(generated.shops.length, spawnPoints.length - centerIds.length);
  assert.equal(new Set([...generated.centers, ...generated.shops].map(item => item.point.id)).size, spawnPoints.length);
  assert.equal(JSON.stringify(options), snapshot);
  assert.deepEqual(generateCity(options), generated);
  assert.notDeepEqual(generateCity({ ...options, seed: CITY_SEED + 1 }), generated);
  assert.deepEqual(generatedCity, generated);
  for (const point of spawnPoints) {
    assert.equal(buildings.filter(b => b.lotId === point.id).length, 1, 'each lot is rendered and has one collision building');
  }
});

test('generation handles missing shops safely and rejects insufficient, duplicate or invalid inputs', () => {
  const options = { spawnPoints, normalShops: [], sunCareCenters: centerIds, seed: 0, minShopGap: 0, minCenterDistance: 0 };
  const generated = generateCity(options);
  assert.equal(generated.centers.length, 5);
  assert.equal(generated.shops.length, 0);
  assert.equal(generated.unfilledLots.length, spawnPoints.length - 5);
  assert.throws(() => generateCity({ ...options, spawnPoints: spawnPoints.slice(0, 4) }), /Not enough/);
  assert.throws(() => generateCity({ ...options, spawnPoints: [...spawnPoints, spawnPoints[0]] }), /unique/);
  assert.throws(() => generateCity({ ...options, spawnPoints: [...spawnPoints, { ...spawnPoints[0], id: 'duplicate-position' }] }), /unique/);
  assert.throws(() => generateCity({ ...options, sunCareCenters: ['a', 'a'] }), /unique/);
  assert.throws(() => generateCity({ ...options, seed: NaN }), /seed/);
  assert.deepEqual(generateCity({ spawnPoints: [], normalShops: [], sunCareCenters: [], seed: 1 }), { centers: [], shops: [], unfilledLots: [] });
});

test('100 sampled seeds keep generated buildings separate and preserve full arrival-zone clearance', () => {
  for (let seed = 0; seed < 100; seed++) {
    const generated = generateCity({ spawnPoints, normalShops: shopPrefabs.map(p => p.id), sunCareCenters: centerIds, seed, ...CITY_GENERATION_RULES });
    const all = [...generated.centers, ...generated.shops];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i].point.position, b = all[j].point.position;
      assert.ok(Math.abs(a[0] - b[0]) > 12 || Math.abs(a[2] - b[2]) > 12, 'largest footprints cannot overlap');
    }
    for (const { point } of generated.centers) {
      for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
        assert.equal(collides(point.arrival[0] + Math.cos(angle) * 4, point.arrival[1] + Math.sin(angle) * 4), false);
      }
    }
    assert.deepEqual(generated.centers.map(center => center.point.district), centerDistrictIds, 'exactly one center in each outer district');
    let previousIndex = -1;
    const shopLots = new Set(generated.shops.map(shop => shop.point.id));
    for (let i = 0; i < generated.centers.length; i++) {
      const point = generated.centers[i].point, index = spawnPoints.indexOf(point);
      assert.ok(index - previousIndex - 1 >= CITY_GENERATION_RULES.minShopGap);
      assert.ok(spawnPoints.slice(previousIndex + 1, index).every(lot => shopLots.has(lot.id)), 'gaps contain shops, not empty lots');
      previousIndex = index;
      for (let j = 0; j < i; j++) {
        const other = generated.centers[j].point;
        assert.ok(Math.hypot(point.position[0] - other.position[0], point.position[2] - other.position[2]) >= 220);
        assert.ok(Math.hypot(point.arrival[0] - other.arrival[0], point.arrival[1] - other.arrival[1]) >= 220);
      }
    }
  }
});

test('infeasible density or spacing reports errors rather than dropping centers or relaxing limits', () => {
  const options = { spawnPoints, normalShops: ['shop'], sunCareCenters: centerIds, seed: CITY_SEED, ...CITY_GENERATION_RULES };
  assert.throws(() => generateCity({ ...options, normalShops: [] }), /Shop prefabs/);
  assert.throws(() => generateCity({ ...options, minShopGap: 1000 }), /shop gap/);
  assert.throws(() => generateCity({ ...options, minCenterDistance: 100000 }), /Unable/);
  assert.throws(() => generateCity({ ...options, minShopGap: 1.5 }), /spacing/);
  assert.throws(() => generateCity({ ...options, minCenterDistance: NaN }), /spacing/);
  assert.throws(() => generateCity({ ...options, centerDistricts: ['missing'] }), /district/);
  assert.throws(() => generateCity({ ...options, centerDistricts: centerIds.map(() => 'same') }), /distinct/);
  assert.throws(() => generateCity({ ...options, centerDistricts: [...centerDistrictIds.slice(0, 4), 'missing'] }), /Unable/);
});

test('all candidate lots in different center districts meet the physical separation guarantee', () => {
  const groups = centerDistrictIds.map(district => spawnPoints.filter(point => point.district === district));
  for (const group of groups) assert.equal(group.length, 16, 'each large district has equal capacity');
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
    for (const a of groups[i]) for (const b of groups[j]) {
      assert.ok(Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]) >= CITY_GENERATION_RULES.minCenterDistance);
      assert.ok(Math.hypot(a.arrival[0] - b.arrival[0], a.arrival[1] - b.arrival[1]) >= CITY_GENERATION_RULES.minCenterDistance);
    }
  }
});

test('outer grid districts form connected blocks, frontage nodes, T and cross intersections', () => {
  assert.equal(cityBlocks.length, 96);
  assert.equal(streetDistricts.length, 7);
  assert.ok(streetJunctions.some(junction => junction.kind === 'cross'));
  assert.ok(streetJunctions.some(junction => junction.kind === 'tee'));
  assert.equal(new Set(roadNodes.map(node => node.id)).size, roadNodes.length);
  assert.equal(new Set(roadNodes.map(node => node.point.join(','))).size, roadNodes.length);
  for (const district of streetDistricts) {
    assert.ok(roads.some(road => road.from === district.exit && road.to === district.entry));
  }
  const frontages = new Set();
  for (const block of cityBlocks) {
    assert.equal(block.width, 32); assert.equal(block.depth, 32);
    assert.equal(block.lotWidth, 16); assert.equal(block.lotDepth, 16);
    assert.ok(block.lotWidth + 12 + 4 <= block.width && block.lotDepth + 12 + 4 <= block.depth, 'lots leave space for street and both sidewalks');
    assert.ok(spawnPoints.some(point => point.id === block.lot.id), 'grid lot is eligible for generation');
    assert.deepEqual(nodeById.get(block.lot.roadNode).point, block.lot.arrival);
    assert.ok(!frontages.has(block.lot.roadNode), 'two centers cannot share one arrival frontage');
    frontages.add(block.lot.roadNode);
    assert.ok(findRoadRoute('0-0', block.lot.roadNode).length > 1);
    assert.ok(Math.abs(block.center[0]) + block.width / 2 < CITY_LIMIT);
    assert.ok(Math.abs(block.center[1]) + block.depth / 2 < CITY_LIMIT);
  }
  // Main streets have building sites on both sides, rather than a single roadside row.
  assert.ok(cityBlocks.some(b => b.district === 'west' && b.center[0] < -116));
  assert.ok(cityBlocks.some(b => b.district === 'west' && b.center[0] > -116));
  assert.ok(cityBlocks.some(b => b.district === 'south' && b.center[1] < 116));
  assert.ok(cityBlocks.some(b => b.district === 'south' && b.center[1] > 116));
});

test('render interpolation smooths between physics steps without modifying simulation state', () => {
  const previous = createVehicle();
  const current = { x: -2, z: 8, angle: 0.2, speed: 5 };
  const snapshot = { ...current };
  const output = createVehicle();
  interpolateVehicle(previous, current, 0.25, output);
  assert.deepEqual(output, { x: -0.5, z: SPAWN.z + (8 - SPAWN.z) * 0.25, angle: 0.05, speed: 1.25 });
  assert.deepEqual(current, snapshot);
  assert.deepEqual(previous, createVehicle());
  interpolateVehicle(previous, current, 2, output);
  assert.deepEqual(output, current);
  interpolateVehicle(previous, current, -1, output);
  assert.deepEqual(output, previous);
});

test('touch steering ramps at 5 units/sec, self-centers, and maps left to vehicle heading', () => {
  const touch = new TouchController();
  touch.press(1, 'left'); touch.press(2, 'gas');
  touch.update(0.1);
  assert.equal(touch.InputSteer, -0.5);
  assert.equal(touch.InputThrottle, 1);
  touch.update(0.1);
  assert.equal(touch.InputSteer, -1);
  const vehicle = createVehicle();
  drive(vehicle, { ...idle, throttle: touch.InputThrottle, steer: -touch.InputSteer }, 80);
  assert.ok(vehicle.x < 0 && vehicle.angle > 0, 'touch left turns left');
  touch.release(1); touch.update(0.1);
  assert.equal(touch.InputSteer, -0.5);
  touch.update(0.1);
  assert.equal(touch.InputSteer, 0);
  touch.press(3, 'right'); touch.update(1);
  assert.equal(touch.InputSteer, 1);
});

test('touch supports multiple fingers, left priority, independent release and full clear', () => {
  const touch = new TouchController();
  touch.press(1, 'gas'); touch.press(2, 'gas'); touch.press(3, 'brake');
  touch.press(4, 'right'); touch.press(5, 'left'); touch.update(1);
  assert.equal(touch.InputSteer, -1);
  assert.equal(touch.InputBrake, 1);
  touch.release(1); touch.release(5); touch.update(1);
  assert.equal(touch.InputThrottle, 1);
  assert.equal(touch.InputSteer, 1);
  touch.release(2); touch.release(3); touch.update(0);
  assert.equal(touch.InputThrottle, 0);
  assert.equal(touch.InputBrake, 0);
  touch.clear(); touch.update(1);
  assert.deepEqual([touch.InputSteer, touch.InputThrottle, touch.InputBrake], [0, 0, 0]);
});

test('virtual joystick steers proportionally, self-centers on release and clears with other touch input', () => {
  const touch = new TouchController();
  touch.setSteering(1, 0.4); touch.press(2, 'gas');
  touch.update(0.08);
  assert.equal(touch.InputSteer, 0.4);
  assert.equal(touch.InputThrottle, 1);
  touch.setSteering(1, -0.8); touch.update(0.1);
  assert.ok(Math.abs(touch.InputSteer + 0.1) < 1e-10);
  touch.release(1); touch.update(0.1);
  assert.equal(touch.InputSteer, 0);
  assert.equal(touch.InputThrottle, 1);
  touch.setSteering(3, 5); touch.update(1);
  assert.equal(touch.InputSteer, 1, 'joystick input clamps to the steering limit');
  touch.clear(); touch.update(1);
  assert.deepEqual([touch.InputSteer, touch.InputThrottle, touch.InputReverse, touch.InputBrake], [0, 0, 0, 0]);
});
function drive(state, input, steps) { for (let i = 0; i < steps; i++) stepVehicle(state, input); }

test('touch reverse slows forward motion then reverses, cancels gas and clears on release/reset', () => {
  const touch = new TouchController();
  touch.press(1, 'reverse'); touch.update(0);
  const vehicle = { ...createVehicle(), speed: 5 };
  drive(vehicle, { ...idle, throttle: touch.InputThrottle - touch.InputReverse }, 240);
  assert.ok(vehicle.speed < 0 && vehicle.z > SPAWN.z, 'reverse moves backward after slowing');
  touch.press(2, 'gas'); touch.update(0);
  assert.equal(touch.InputThrottle - touch.InputReverse, 0, 'opposed pedals cancel');
  touch.release(1); touch.update(0);
  assert.equal(touch.InputReverse, 0);
  assert.equal(touch.InputThrottle, 1);
  touch.press(3, 'reverse'); touch.update(0); touch.clear(); touch.update(1);
  assert.equal(touch.InputReverse, 0);
  assert.equal(touch.InputThrottle, 0);
});

test('forward, reverse, left steering and reverse steering have correct direction', () => {
  const s = createVehicle();
  drive(s, { ...idle, throttle: 1 }, 120);
  assert.ok(s.z < SPAWN.z && s.speed > 0 && s.speed <= MAX_FORWARD_SPEED);
  const left = createVehicle();
  drive(left, { ...idle, throttle: 1, steer: 1 }, 80);
  assert.ok(left.x < 0 && left.angle > 0);
  const reverse = createVehicle();
  drive(reverse, { ...idle, throttle: -1, steer: 1 }, 80);
  assert.ok(reverse.z > SPAWN.z && reverse.angle < 0 && reverse.speed >= -8);
});

test('held throttle accelerates beyond 80 km/h to 120 on a continuous road', () => {
  const state = { x: 0, z: 420, angle: 0, speed: 0 };
  let previous = 0;
  for (let i = 0; i < 1200; i++) {
    stepVehicle(state, { ...idle, throttle: 1 });
    assert.ok(state.speed >= previous && state.speed <= MAX_FORWARD_SPEED);
    previous = state.speed;
  }
  assert.ok(state.speed * 3.6 > 80);
  assert.equal(state.speed, MAX_FORWARD_SPEED);
  assert.equal(collides(state.x, state.z), false);
});

test('braking and coasting reduce speed; throttle with brake remains slow', () => {
  const brake = { ...createVehicle(), speed: MAX_FORWARD_SPEED };
  drive(brake, { ...idle, brake: true }, 120);
  assert.equal(brake.speed, 0);
  const coast = { ...createVehicle(), speed: MAX_FORWARD_SPEED };
  drive(coast, idle, 120);
  assert.ok(coast.speed < 7);
  drive(brake, { ...idle, throttle: 1, brake: true }, 120);
  assert.ok(brake.speed < 1.4);
});

test('top-speed approaches cannot tunnel through buildings or city limits; reverse escapes contact', () => {
  for (const o of obstacles) {
    const s = { x: o.x, z: o.z + o.halfZ + CAR_RADIUS + 1, angle: 0, speed: MAX_FORWARD_SPEED };
    if (collides(s.x, s.z)) continue;
    drive(s, { ...idle, throttle: 1 }, 60);
    assert.ok(s.z >= o.z + o.halfZ + CAR_RADIUS);
    assert.equal(collides(s.x, s.z), false);
    const before = s.z;
    drive(s, { ...idle, throttle: -1 }, 60);
    assert.ok(s.z > before, 'can reverse away from contact');
  }
  const boundary = { x: -CITY_LIMIT + 10, z: 0, angle: Math.PI / 2, speed: MAX_FORWARD_SPEED };
  drive(boundary, { ...idle, throttle: 1 }, 3000);
  assert.ok(Math.abs(boundary.x) <= CITY_LIMIT - CAR_RADIUS);
  assert.ok(boundary.x <= -CITY_LIMIT + CAR_RADIUS + 0.2);
  assert.equal(collides(boundary.x, boundary.z), false);
});

test('five arrival zones and every ring/radial road have full vehicle clearance', () => {
  assert.deepEqual(locations.map(l => l.shortName), ['永春大和', '樂活安南', '七股龍山', '七股義合', '樂活新營']);
  assert.equal(collides(SPAWN.x, SPAWN.z), false);
  for (const location of locations) {
    assert.equal(collides(...location.arrival), false);
    assert.equal(hasArrived(...location.arrival, locations.indexOf(location)), true);
    assert.equal(hasArrived(location.arrival[0] + 5, location.arrival[1], locations.indexOf(location)), false);
  }
  for (const road of roads) {
    const [x, z] = nodeById.get(road.from).point, [nx, nz] = nodeById.get(road.to).point;
    for (let t = 0; t <= 1; t += 0.01) assert.equal(collides(x + (nx - x) * t, z + (nz - z) * t), false, `${road.from} -> ${road.to}`);
  }
  for (const node of roadNodes) for (const location of locations) {
    const route = findRoadRoute(node.id, location.roadNode);
    assert.ok(route.length > 0, `${node.id} connects to ${location.id}`);
    for (let i = 1; i < route.length; i++) {
      assert.ok(roads.some(road => {
        const a = nodeById.get(road.from).point, b = nodeById.get(road.to).point;
        return a === route[i - 1] && b === route[i] || b === route[i - 1] && a === route[i];
      }), 'navigation follows road edges');
    }
  }
});

test('ordered mission advancement, completion idempotence and full restart', () => {
  useGame.getState().reset();
  useGame.getState().visitPosition(...locations[3].arrival);
  assert.equal(useGame.getState().missionIndex, 0, 'early visit cannot skip');
  for (let i = 0; i < locations.length; i++) {
    assert.equal(useGame.getState().missionIndex, i);
    assert.equal(hasArrived(...locations[i].arrival, i), true);
    useGame.getState().visitPosition(...locations[i].arrival);
    const after = useGame.getState().missionIndex;
    useGame.getState().visitPosition(...locations[i].arrival);
    assert.equal(useGame.getState().missionIndex, after, 'repeated visit does not count twice');
  }
  assert.equal(useGame.getState().completed, true);
  useGame.getState().visitPosition(...locations[0].arrival);
  assert.equal(useGame.getState().missionIndex, locations.length - 1);
  const resetKey = useGame.getState().resetKey;
  useGame.getState().setTelemetry(40, 20);
  useGame.getState().reset();
  const state = useGame.getState();
  assert.equal(state.completed, false);
  assert.equal(state.missionIndex, 0);
  assert.equal(state.speed, 0);
  assert.equal(state.resetKey, resetKey + 1);
  assert.deepEqual(createVehicle(), SPAWN);
});

test('river and banks block top-speed approaches; bridge works both directions and rails stop sideways travel', () => {
  for (const z of [-105, -60, 60, 105]) {
    const s = { x: 75, z, angle: -Math.PI / 2, speed: MAX_FORWARD_SPEED };
    drive(s, { ...idle, throttle: 1 }, 180);
    assert.ok(s.x < river.x - river.halfWidth - CAR_RADIUS);
    assert.equal(collides(s.x, s.z), false);
    const contact = s.x;
    drive(s, { ...idle, throttle: -1 }, 80);
    assert.ok(s.x < contact, 'reverse escapes riverbank');
  }
  for (const z of river.bridgeCenters) for (const direction of [-1, 1]) {
    const start = direction === 1 ? 78 : 102;
    const s = { x: start, z, angle: -direction * Math.PI / 2, speed: MAX_FORWARD_SPEED };
    drive(s, { ...idle, throttle: 1 }, 150);
    assert.ok(direction * (s.x - start) > 20, 'bridge crosses river');
    assert.equal(collides(s.x, s.z), false);
  }
  const sideways = { x: river.x, z: 0, angle: 0, speed: MAX_FORWARD_SPEED };
  drive(sideways, { ...idle, throttle: 1 }, 120);
  assert.ok(sideways.z > -river.bridgeHalfWidth + CAR_RADIUS);
  assert.equal(collides(sideways.x, sideways.z), false);
});

test('all service entrances connect to roads; reference status stays explicit and day work remains separate', () => {
  for (const location of locations) {
    const hasReference = ['daihe', 'annan', 'xinying'].includes(location.id);
    assert.equal(location.reference.status, hasReference ? 'provided' : 'missing');
    assert.equal(location.reference.source, hasReference ? 'user-attachment' : 'awaiting-photo');
    assert.equal(location.reference.photo, null);
    for (let angle = 0; angle < Math.PI * 2; angle += 0.15) {
      assert.equal(collides(location.arrival[0] + Math.cos(angle) * location.radius, location.arrival[1] + Math.sin(angle) * location.radius), false, location.id);
    }
  }
  for (const service of servicePoints) {
    assert.equal(collides(...service.arrival), false, service.id);
    assert.ok(roadNodes.some(node => Math.hypot(node.point[0] - service.arrival[0], node.point[1] - service.arrival[1]) < 0.01));
    assert.equal(service.reference.status, 'missing');
  }
  assert.ok(!locations.some(location => location.id === 'day-work'));
  assert.ok(servicePoints.some(service => service.id === 'day-work'));
});
