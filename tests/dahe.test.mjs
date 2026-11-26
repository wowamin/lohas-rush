import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKERS, PLAYER_RADIUS, PREVIEW_KEY, ROOM, START, ZONES, blocked, nearZone, parseProgress, stepWalker } from '../src/features/dahe/interior.ts';
import { constrainCamera } from '../src/game/camera/cameraCollision.ts';
import { createPassengerModel } from '../src/game/vehicle/passengerModels.ts';
import { Vector3 } from 'three';
import { disposeModels } from '../src/game/assets/GameAssets.ts';
import { CENTER_INTERIORS, interiorHref, resolveInterior } from '../src/features/dahe/centers.ts';
import { locations } from '../src/data/locations.ts';
import { cameraRelativeMovement, INTERIOR_AIM_HEIGHT } from '../src/features/dahe/interiorCamera.ts';
import { MouseOrbit } from '../src/game/camera/MouseOrbit.ts';

test('interior movement follows the selected view, preserves diagonal speed and keeps the original heading at reset', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 7 * Math.PI]) {
    const forward = cameraRelativeMovement(0, -1, yaw), right = cameraRelativeMovement(1, 0, yaw);
    assert(Math.abs(Math.hypot(forward.x, forward.z) - 1) < 1e-12);
    assert(Math.abs(forward.x * right.x + forward.z * right.z) < 1e-12);
    assert(Math.abs(Math.hypot(...Object.values(cameraRelativeMovement(1, -1, yaw))) - Math.SQRT2) < 1e-12);
    const pose = { x: 0, z: 0, angle: 0 };
    stepWalker(pose, forward.x, forward.z, false, 1 / 60);
    assert(Math.abs(pose.x - forward.x * 2.2 / 60) < 1e-12);
    assert(Math.abs(pose.z - forward.z * 2.2 / 60) < 1e-12);
  }
  assert.deepEqual(cameraRelativeMovement(1, -1, 0), { x: 1, z: -1 });
});

test('the reused orbit and interior camera blockers keep all viewing directions finite and outside furniture', () => {
  const orbit = new MouseOrbit(), camera = new Vector3();
  for (const zone of ZONES) for (const radius of [4, 14]) for (const pitch of [.12, .6, 1.35]) {
    const target = { x: zone.point[0], z: zone.point[1], angle: 0, speed: 0 };
    const focus = new Vector3(target.x, INTERIOR_AIM_HEIGHT, target.z);
    for (let i = 0; i < 32; i++) {
      orbit.yaw = i * Math.PI / 16; orbit.pitch = pitch; orbit.radius = radius;
      orbit.apply(camera, target, INTERIOR_AIM_HEIGHT); constrainCamera(focus, camera, BLOCKERS, .18);
      assert(camera.toArray().every(Number.isFinite));
      assert(camera.y >= INTERIOR_AIM_HEIGHT && camera.distanceTo(focus) <= radius + 1e-10);
      assert(!BLOCKERS.some(b => ['x', 'y', 'z'].every(axis => camera[axis] > b.min[axis] - .18 && camera[axis] < b.max[axis] + .18)));
    }
  }
});

test('each existing center has an isolated preview and base-relative route; the old Dahe URL/save stay compatible', () => {
  assert.deepEqual(CENTER_INTERIORS.map(center => center.id), locations.map(location => location.id));
  assert.equal(new Set(CENTER_INTERIORS.map(center => center.progressKey)).size, locations.length);
  assert.equal(resolveInterior(new URLSearchParams('scene=dahe'))?.progressKey, PREVIEW_KEY);
  for (const center of CENTER_INTERIORS) {
    const url = new URL(interiorHref(center, './'), 'https://example.test/game/');
    assert.equal(url.pathname, '/game/');
    assert.equal(resolveInterior(url.searchParams)?.id, center.id);
  }
  assert.equal(resolveInterior(new URLSearchParams('scene=interior&center=unknown')), undefined);
  assert.equal(resolveInterior(new URLSearchParams('scene=pedestrian')), undefined);
});

test('the fictional interior has a clear spawn and all five interaction points are reachable with the actual player radius', () => {
  assert(!blocked(START.x, START.z));
  const queue = [[0, 23]], seen = new Set(['0,23']); // quarter-unit navigation sampling
  for (let head = 0; head < queue.length; head++) {
    const [x, z] = queue[head];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, key = `${nx},${nz}`;
      if (seen.has(key) || blocked(nx / 4, nz / 4)) continue;
      seen.add(key); queue.push([nx, nz]);
    }
  }
  for (const zone of ZONES) {
    assert(!blocked(...zone.point), `${zone.id} center must be clear`);
    assert.equal(nearZone(...zone.point), zone.id);
    assert(queue.some(([x, z]) => Math.hypot(x / 4 - zone.point[0], z / 4 - zone.point[1]) < .4), `${zone.id} cannot be reached from the entrance`);
  }
  assert.equal(nearZone(100, 100), null);
});

test('walking respects furniture and walls at normal and fast speeds, slides along edges, and normalizes diagonal speed', () => {
  for (const fast of [false, true]) {
    for (const [x, z, dx, dz] of [[0, 0, -1, 0], [0, 0, 1, 0], [0, 0, 0, -1], [0, 0, 0, 1]]) {
      const player = { x, z, angle: 0 };
      for (let i = 0; i < 6000; i++) { stepWalker(player, dx, dz, fast, 1 / 120); assert(!blocked(player.x, player.z)); }
      assert(Math.abs(player.x) + PLAYER_RADIUS < ROOM.halfX);
      assert(Math.abs(player.z) + PLAYER_RADIUS < ROOM.halfZ);
    }
  }
  const diagonal = { x: 0, z: 0, angle: 0 }, straight = { ...diagonal };
  stepWalker(diagonal, 1, 1, false, 1 / 120); stepWalker(straight, 1, 0, false, 1 / 120);
  assert(Math.abs(Math.hypot(diagonal.x, diagonal.z) - straight.x) < 1e-8);
  assert(blocked(NaN, 0));
  const camera = { x: -14, y: 2, z: 0 }, focus = { x: -9, y: 1.2, z: 0 };
  assert(constrainCamera(focus, camera, BLOCKERS, .18));
  assert(camera.x > -10.8, 'the camera must remain in front of the padded west wall');
});

test('preview progress is bounded and versioned; incompatible saves are preserved', () => {
  assert.equal(PREVIEW_KEY, 'lohas-rush:dahe-preview:v1');
  for (const completed of [0, 1, 5]) assert.deepEqual(parseProgress(JSON.stringify({ version: 1, completed })), { completed, writable: true });
  for (const raw of [null, 'bad', 'null', '[]', '{"version":1,"completed":99}', '{"version":1,"completed":1.5}']) assert.deepEqual(parseProgress(raw), { completed: 0, writable: true });
  assert.deepEqual(parseProgress('{"version":2,"completed":3}'), { completed: 0, writable: false });
});

test('grandma and her reused wheelchair stay inside the interior collision radius at every heading', () => {
  const model = createPassengerModel('grandma'), point = new Vector3();
  model.scale.setScalar(.9);
  try {
    for (let i = 0; i < 40; i++) {
      model.rotation.y = i / 40 * Math.PI * 2;
      model.updateMatrixWorld(true);
      model.traverse(mesh => {
        if (!mesh.isMesh) return;
        const positions = mesh.geometry.getAttribute('position');
        for (let v = 0; v < positions.count; v++) {
          point.fromBufferAttribute(positions, v).applyMatrix4(mesh.matrixWorld);
          assert(Math.hypot(point.x, point.z) <= PLAYER_RADIUS, 'grandma and the wheelchair must fit the movement collision circle');
        }
      });
    }
  } finally { disposeModels([model]); }
});
