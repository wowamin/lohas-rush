import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameStore } from '../src/stores/game.ts';
import { JOURNEY_STORAGE_KEY as key, loadJourney, newJourney, serializeJourney } from '../src/progress/persistence.ts';
import { locations, obstacles } from '../src/data/city.ts';
import { SPAWN } from '../src/data/roadNetwork.ts';

class MemoryStorage {
  values = new Map(); writes = 0;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); this.writes++; }
}

test('journey resumes ordered missions, bus pose and camera while parking all actors safely', () => {
  const storage = new MemoryStorage(), store = createGameStore(storage, () => 5000);
  store.getState().setBoardingTelemetry(0, 0, 40, .5);
  store.getState().visitPosition(...locations[0].arrival);
  store.getState().cycleCamera();
  store.getState().setTransferStatus('outside');
  store.getState().setTelemetry(4, 30, 8, 44, 1.2); // Wheelchair telemetry must never become the bus pose.
  store.getState().flushProgress();
  const saved = JSON.parse(storage.getItem(key));
  assert.deepEqual(saved.vehicle, { x: 0, z: 40, angle: .5 });
  assert.equal(saved.missionIndex, 1);
  for (const forbidden of ['speed', 'transferPhase', 'controlsPaused', 'resetKey', 'transferRequest']) assert.equal(forbidden in saved, false);
  const resumed = createGameStore(storage).getState();
  assert.equal(resumed.missionIndex, 1); assert.equal(resumed.cameraMode, 'overview');
  assert.equal(resumed.x, 0); assert.equal(resumed.z, 40); assert.equal(resumed.speed, 0);
  assert.equal(resumed.transferPhase, 'stowed'); assert.equal(resumed.transferRequest, 0);
  assert.match(resumed.saveNotice, /已接續/);
});

test('frequent telemetry writes are limited; explicit flush and mission changes save immediately', () => {
  const storage = new MemoryStorage(); let time = 1000;
  const store = createGameStore(storage, () => time);
  store.getState().setBoardingTelemetry(0, 0, 34, 0);
  for (let i = 0; i < 15; i++) { time += 100; store.getState().setBoardingTelemetry(0, 0, 34 + i, 0); }
  assert.equal(storage.writes, 1);
  store.getState().flushProgress(); assert.equal(storage.writes, 2);
  store.getState().flushProgress(); assert.equal(storage.writes, 2, 'unchanged snapshots do not write again');
  store.getState().visitPosition(...locations[0].arrival); assert.equal(storage.writes, 3);
});

test('reset persists a new journey, preserves the exploration journal, and completion survives reload', () => {
  const storage = new MemoryStorage(), store = createGameStore(storage);
  storage.setItem('lohas-rush:exploration', 'existing journal');
  for (const location of locations) store.getState().visitPosition(...location.arrival);
  assert.equal(createGameStore(storage).getState().completed, true);
  store.getState().reset();
  const resumed = createGameStore(storage).getState();
  assert.equal(resumed.missionIndex, 0); assert.equal(resumed.completed, false);
  assert.equal(resumed.x, SPAWN.x); assert.equal(resumed.z, SPAWN.z);
  assert.equal(storage.getItem('lohas-rush:exploration'), 'existing journal');
});

test('corrupt or incompatible route data cannot skip missions; blocked positions keep progress at the spawn', () => {
  const good = JSON.parse(serializeJourney(newJourney(), 1000));
  for (const patch of [{ missionIndex: -1 }, { missionIndex: 99 }, { completed: true }, { route: ['unknown'] }, { vehicle: { x: '0', z: 0, angle: 0 } }, { cameraMode: 'invalid' }]) {
    const loaded = loadJourney(JSON.stringify({ ...good, ...patch }));
    assert.equal(loaded.journey.missionIndex, 0); assert.match(loaded.notice, /格式無效/);
  }
  assert.match(loadJourney('{broken').notice, /格式無效/);
  const loaded = loadJourney(JSON.stringify({ ...good, missionIndex: 2, vehicle: { x: obstacles[0].x, z: obstacles[0].z, angle: 0 } }));
  assert.equal(loaded.journey.missionIndex, 2); assert.deepEqual(loaded.journey.vehicle, newJourney().vehicle);
  assert.match(loaded.notice, /原停車位置/);
});

test('unknown future saves are preserved and storage failures leave the game playable with a warning', () => {
  const storage = new MemoryStorage(), original = '{"version":999,"future":"keep"}';
  storage.setItem(key, original);
  const store = createGameStore(storage);
  store.getState().setBoardingTelemetry(0, 0, 45); store.getState().reset(); store.getState().flushProgress();
  assert.equal(storage.getItem(key), original); assert.match(store.getState().saveNotice, /較新版本/);
  const blocked = createGameStore({ getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } });
  blocked.getState().visitPosition(...locations[0].arrival);
  assert.equal(blocked.getState().missionIndex, 1); assert.match(blocked.getState().saveNotice, /未能儲存/);
  assert.match(createGameStore(null).getState().saveNotice, /儲存被停用/);
});
