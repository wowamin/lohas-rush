import test from 'node:test';
import assert from 'node:assert/strict';
import { createVehicle, stepVehicle } from '../src/game/vehicle/drivingPhysics.ts';
import { collides, CAR_RADIUS } from '../src/game/collision/collisionSystem.ts';
import { hasArrived } from '../src/game/missions/missionSystem.ts';
import { locations, obstacles, CITY_LIMIT } from '../src/data/city.ts';
import { useGame } from '../src/stores/game.ts';

const idle = { throttle: 0, steer: 0, brake: false };
function drive(state, input, steps) { for (let i = 0; i < steps; i++) stepVehicle(state, input); }

test('forward, reverse, left steering and reverse steering have correct direction', () => {
  const s = createVehicle();
  drive(s, { ...idle, throttle: 1 }, 120);
  assert.ok(s.z < 12 && s.speed > 0 && s.speed <= 18);
  const left = createVehicle();
  drive(left, { ...idle, throttle: 1, steer: 1 }, 80);
  assert.ok(left.x < 0 && left.angle > 0);
  const reverse = createVehicle();
  drive(reverse, { ...idle, throttle: -1, steer: 1 }, 80);
  assert.ok(reverse.z > 12 && reverse.angle < 0 && reverse.speed >= -8);
});

test('braking and coasting reduce speed; throttle with brake remains slow', () => {
  const brake = { ...createVehicle(), speed: 18 };
  drive(brake, { ...idle, brake: true }, 120);
  assert.equal(brake.speed, 0);
  const coast = { ...createVehicle(), speed: 18 };
  drive(coast, idle, 120);
  assert.ok(coast.speed < 4);
  drive(brake, { ...idle, throttle: 1, brake: true }, 120);
  assert.ok(brake.speed < 1.4);
});

test('top-speed approaches cannot tunnel through buildings, corners or city limits', () => {
  for (const o of obstacles) {
    const s = { x: o.x, z: o.z + 10, angle: 0, speed: 18 };
    drive(s, { ...idle, throttle: 1 }, 300);
    assert.ok(s.z >= o.z + o.halfZ + CAR_RADIUS);
    assert.equal(collides(s.x, s.z), false);
  }
  const corner = { x: -24, z: 0, angle: -Math.PI / 4, speed: 18 };
  drive(corner, { ...idle, throttle: 1 }, 300);
  assert.equal(collides(corner.x, corner.z), false);
  const reverse = { x: -12, z: -24, angle: 0, speed: -8 };
  drive(reverse, { ...idle, throttle: -1 }, 300);
  assert.equal(collides(reverse.x, reverse.z), false);
  const boundary = createVehicle();
  drive(boundary, { ...idle, throttle: 1 }, 3000);
  assert.ok(Math.abs(boundary.z) <= CITY_LIMIT - CAR_RADIUS);
  assert.equal(collides(boundary.x, boundary.z), false);
});

test('all arrival zones are clear and connected to the road grid', () => {
  for (const location of locations) {
    assert.equal(collides(...location.arrival), false);
    assert.equal(hasArrived(...location.arrival, locations.indexOf(location)), true);
    assert.equal(hasArrived(location.arrival[0] + 5, location.arrival[1], locations.indexOf(location)), false);
  }
  // Sample complete road routes from spawn to the three entrances.
  const points = [[0, 12], [0, -24], [-12, -24], [12, -24], [24, -24], [24, 12]];
  for (let i = 1; i < points.length; i++) {
    const [x, z] = points[i - 1], [nx, nz] = points[i];
    for (let t = 0; t <= 1; t += 0.01) assert.equal(collides(x + (nx - x) * t, z + (nz - z) * t), false);
  }
});

test('ordered mission advancement, completion idempotence and full restart', () => {
  useGame.getState().reset();
  for (let i = 0; i < locations.length; i++) {
    assert.equal(useGame.getState().missionIndex, i);
    assert.equal(hasArrived(...locations[i].arrival, i), true);
    useGame.getState().finishMission();
  }
  assert.equal(useGame.getState().completed, true);
  useGame.getState().finishMission();
  assert.equal(useGame.getState().missionIndex, 2);
  const resetKey = useGame.getState().resetKey;
  useGame.getState().setTelemetry(40, 20);
  useGame.getState().reset();
  const state = useGame.getState();
  assert.equal(state.completed, false);
  assert.equal(state.missionIndex, 0);
  assert.equal(state.speed, 0);
  assert.equal(state.resetKey, resetKey + 1);
  assert.deepEqual(createVehicle(), { x: 0, z: 12, angle: 0, speed: 0 });
});
