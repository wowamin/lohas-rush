import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cityConfig, plannedMissionOrder } from '../src/data/planning/cityConfig.ts';
import { districtConfig } from '../src/data/planning/districtConfig.ts';
import { landmarkConfig, partnerHospitals, plannedDayCenters, plannedMissions, providedNursingHomeNames, providedResidentialCareNames } from '../src/data/planning/landmarkConfig.ts';
import { buildings, HEADQUARTERS_FOOTPRINT_SCALE } from '../src/data/city.ts';

test('scheme C reserves the requested city and ecosystem without inventing missing names or assets', () => {
  assert.equal(cityConfig.enabled, false); assert.equal(cityConfig.status, 'data-only');
  assert.equal(cityConfig.world.width, 2400); assert.equal(cityConfig.world.depth, 2400);
  assert.deepEqual(cityConfig.roads.rings.map(r => r.radius), [110, 350, 650, 980]);
  assert.equal(cityConfig.roads.radial.count, 8);
  assert.equal(new Set(landmarkConfig.map(b => b.id)).size, landmarkConfig.length);
  const count = type => landmarkConfig.filter(b => b.type === type).length;
  assert.equal(count('residential-care'), 8); assert.equal(count('nursing-home'), 4); assert.equal(count('day-center'), 5);
  assert.equal(count('partner-hospital'), 8);
  assert.equal(count('clinic'), 1); assert.equal(count('foundation'), 1);
  assert.equal(count('care-management'), 1); assert.equal(count('training'), 1);
  assert.equal(count('disability-service'), 1); assert.equal(count('home-nursing'), 1);
  assert.equal(count('home-care'), 2); assert.equal(count('logistics-warehouse'), 1);
  assert.equal(count('transport-base'), 1); assert.equal(count('meal-factory'), 0);
  assert.equal(landmarkConfig.filter(b => b.nameStatus === 'pending').length, 0);
  assert.equal(providedNursingHomeNames.length, 4);
  assert.equal(providedResidentialCareNames.length, 8);
  assert.deepEqual(landmarkConfig.filter(b => b.type === 'residential-care' && b.nameStatus === 'provided').map(b => b.name), providedResidentialCareNames);
  assert.deepEqual(landmarkConfig.filter(b => b.type === 'nursing-home' && b.nameStatus === 'provided').map(b => b.name), providedNursingHomeNames);
  assert.equal(landmarkConfig.filter(b => b.name === '樂活新營住宿式長照機構').length, 1);
  assert.equal(partnerHospitals.length, 8);
  assert.ok(partnerHospitals.every(b => b.type === 'partner-hospital' && b.serviceRelation === 'partner-service'));
  assert.ok(partnerHospitals.every(b => b.notes.includes('非樂活集團自營醫院')));
  assert.deepEqual(partnerHospitals.map(b => b.name.split('｜')[0]), ['部南', '市醫', '安南', '台南新樓', '麻豆新樓', '永康奇美', '柳營奇美', '路竹秀傳']);
  const headquarters = landmarkConfig.filter(b => b.type === 'headquarters');
  assert.equal(headquarters.length, 1);
  assert.equal(headquarters[0].id, 'lohas-headquarters');
  assert.deepEqual(headquarters[0].floors.map(floor => floor.name), ['1F｜樂活現煮食（團膳工廠）', '2F｜樂活長照集團總部辦公室']);
  assert.equal(headquarters[0].floors.reduce((sum, floor) => sum + floor.height, 0), headquarters[0].dimensions.height);
  assert.ok(Math.abs((headquarters[0].dimensions.width * headquarters[0].dimensions.depth) / (40 * 28) - 1.3) < 1e-12);
  assert.ok(Math.abs((headquarters[0].dimensions.width / headquarters[0].dimensions.depth) / (40 / 28) - 1) < 1e-12);
  assert.match(headquarters[0].floors[0].serviceDescription, /出餐月台.*保溫餐車裝卸區/);
  assert.match(headquarters[0].serviceDescription, /單一複合總部建築/);
  const activeHeadquarters = buildings.find(b => b.id === 'headquarters');
  assert.ok(activeHeadquarters);
  assert.ok(Math.abs((activeHeadquarters.halfX * 2 * activeHeadquarters.halfZ * 2) / 100 - 1.3) < 1e-12);
  assert.match(activeHeadquarters.description, /1F.*團膳工廠.*2F.*總部辦公室/);
  for (const b of landmarkConfig) {
    assert.equal(b.modelPath, null);
    assert.ok(b.serviceDescription.length > 0);
    const district = districtConfig.find(d => d.id === b.district);
    assert.ok(district); assert.ok(district.uses.includes(b.type), `${b.id} must have a compatible district use`);
    assert.ok(Object.values(b.dimensions).every(n => n > 0 && Number.isFinite(n)));
    assert.deepEqual(b.collision.halfSize, [b.dimensions.width / 2, b.dimensions.depth / 2]);
    assert.ok(b.rendering.instanceKey); assert.ok(b.rendering.lod.length > 1);
    const [x, , z] = b.position, { width, depth } = b.dimensions;
    assert.ok(x - width / 2 >= -1200 && x + width / 2 <= 1200 && z - depth / 2 >= -1200 && z + depth / 2 <= 1200);
    if (b.nameStatus === 'pending') assert.equal(b.evidence, 'awaiting-service-overview');
  }
  const clinic = landmarkConfig.find(b => b.type === 'clinic');
  assert.ok(clinic.dimensions.depth > clinic.dimensions.width && clinic.dimensions.height > clinic.dimensions.width);
  assert.equal(landmarkConfig.find(b => b.name === '樂活島').type, 'disability-service');
  assert.equal(landmarkConfig.find(b => b.name === '大心復康巴士調度基地').type, 'transport-base');
  assert.equal(landmarkConfig.find(b => b.name === '壹吉棒物流倉儲').type, 'logistics-warehouse');
  assert.ok(cityConfig.streaming.unloadRadius > cityConfig.streaming.loadRadius);
});

test('future five-station coordinates and order are reserved with no enabled missions', () => {
  assert.deepEqual(plannedDayCenters.map(b => [b.position[0], b.position[2]]), [[-300, -410], [360, -460], [730, 0], [380, 510], [-460, 530]]);
  assert.deepEqual(plannedDayCenters.map(b => b.id), plannedMissionOrder);
  assert.deepEqual(plannedDayCenters.map(b => b.missionOrder), [1, 2, 3, 4, 5]);
  assert.deepEqual(plannedDayCenters.map(b => b.missionId), plannedMissions.map(m => m.id));
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
  assert.match(cityConfig.roads.unresolvedReservations[0].proposal, /R675/);
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
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /PlannedBuildingProxy|care-city|city-mode-button/);
  const proxy = await readFile(new URL('../src/game/buildings/PlannedBuildingProxy.tsx', import.meta.url), 'utf8');
  assert.match(proxy, /boxGeometry/);
  assert.match(proxy, /onPointerOver/);
  assert.match(proxy, /onSelect\?\.\(building\)/);
});
