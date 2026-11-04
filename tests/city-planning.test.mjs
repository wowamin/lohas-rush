import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cityConfig, plannedMissionOrder } from '../src/data/planning/cityConfig.ts';
import { districtConfig } from '../src/data/planning/districtConfig.ts';
import { landmarkConfig, plannedDayCenters, plannedMissions } from '../src/data/planning/landmarkConfig.ts';

test('scheme C reserves the requested city and ecosystem without inventing missing names or assets', () => {
  assert.equal(cityConfig.enabled, false); assert.equal(cityConfig.status, 'data-only');
  assert.equal(cityConfig.world.width, 2400); assert.equal(cityConfig.world.depth, 2400);
  assert.deepEqual(cityConfig.roads.rings.map(r => r.radius), [110, 350, 650, 980]);
  assert.equal(cityConfig.roads.radial.count, 8);
  assert.equal(new Set(landmarkConfig.map(b => b.id)).size, landmarkConfig.length);
  const count = type => landmarkConfig.filter(b => b.type === type).length;
  assert.equal(count('residential-care'), 12); assert.equal(count('nursing-center'), 8); assert.equal(count('day-center'), 5);
  assert.equal(landmarkConfig.filter(b => b.nameStatus === 'pending').length, 20);
  for (const b of landmarkConfig) {
    assert.equal(b.modelPath, null);
    assert.ok(districtConfig.some(d => d.id === b.district));
    assert.ok(Object.values(b.dimensions).every(n => n > 0 && Number.isFinite(n)));
    assert.deepEqual(b.collision.halfSize, [b.dimensions.width / 2, b.dimensions.depth / 2]);
    assert.ok(b.rendering.instanceKey); assert.ok(b.rendering.lod.length > 1);
    const [x, , z] = b.position, { width, depth } = b.dimensions;
    assert.ok(x - width / 2 >= -1200 && x + width / 2 <= 1200 && z - depth / 2 >= -1200 && z + depth / 2 <= 1200);
    if (b.nameStatus === 'pending') assert.equal(b.evidence, 'awaiting-service-overview');
  }
  const clinic = landmarkConfig.find(b => b.type === 'clinic');
  assert.ok(clinic.dimensions.depth > clinic.dimensions.width && clinic.dimensions.height > clinic.dimensions.width);
  assert.equal(landmarkConfig.find(b => b.name === '樂活島').type, 'day-work');
  assert.ok(cityConfig.streaming.unloadRadius > cityConfig.streaming.loadRadius);
});

test('future five-station coordinates and order are reserved with no enabled missions', () => {
  assert.deepEqual(plannedDayCenters.map(b => [b.position[0], b.position[2]]), [[-300, -410], [360, -460], [730, 0], [380, 510], [-460, 530]]);
  assert.deepEqual(plannedDayCenters.map(b => b.id), plannedMissionOrder);
  assert.deepEqual(plannedDayCenters.map(b => b.missionOrder), [1, 2, 3, 4, 5]);
  assert.ok(plannedMissions.every(m => !m.enabled && m.arrival === null));
  assert.equal(landmarkConfig.filter(b => b.hasMission).length, 5);
});

test('road clearance detects the fixed Yihe conflict and rejects unrecorded clashes', () => {
  const buildings = landmarkConfig.filter(b => b.collision.enabled);
  const { radial, rings, buildingSetback } = cityConfig.roads;
  const conflicts=[];
  for (const b of buildings) {
    const [x, , z] = b.position, radius = Math.hypot(x, z);
    const halfDiagonal = Math.hypot(b.dimensions.width / 2, b.dimensions.depth / 2);
    for (const ring of rings) if(Math.abs(radius - ring.radius) <= halfDiagonal + ring.width / 2 + buildingSetback) conflicts.push({landmarkId:b.id,roadId:ring.id});
    for (let i = 0; i < radial.count; i++) {
      const a = radial.angleOffset + i * Math.PI * 2 / radial.count, ux = Math.cos(a), uz = Math.sin(a);
      const t = Math.max(radial.innerRadius, Math.min(radial.outerRadius, x * ux + z * uz));
      assert.ok(Math.hypot(x - t * ux, z - t * uz) > halfDiagonal + radial.width / 2 + buildingSetback, `${b.id} overlaps radial ${i}`);
    }
  }
  assert.deepEqual(conflicts,cityConfig.roads.unresolvedReservations.map(({landmarkId,roadId})=>({landmarkId,roadId})));
  assert.ok(cityConfig.activationBlockedBy.includes('yihe-middle-ring-conflict'));
  for (let i = 0; i < buildings.length; i++) for (let j = i + 1; j < buildings.length; j++) {
    const a = buildings[i], b = buildings[j];
    assert.ok(Math.abs(a.position[0] - b.position[0]) >= (a.dimensions.width + b.dimensions.width) / 2
      || Math.abs(a.position[2] - b.position[2]) >= (a.dimensions.depth + b.dimensions.depth) / 2, `${a.id} overlaps ${b.id}`);
  }
});

test('the dormant plan is not wired into the active scene, city, routes or mission state', async () => {
  for (const file of ['src/App.tsx', 'src/game/City.tsx', 'src/data/city.ts', 'src/data/locations.ts', 'src/data/roadNetwork.ts', 'src/stores/game.ts']) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /planning\/|landmarkConfig|districtConfig|plannedMissionOrder/, file);
  }
});
