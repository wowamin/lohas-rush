import test from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY, QualitySampler, selectDeviceQuality } from '../src/game/rendering/quality.ts';
import { createSurface } from '../src/game/rendering/materials.ts';
import { useVisual } from '../src/stores/visual.ts';

const device = { width: 1280, height: 720, dpr: 1, memory: 8, cores: 8, coarse: false };
test('device selection combines framebuffer resolution, optional memory and cores instead of assuming all phones are slow', () => {
  assert.equal(selectDeviceQuality(device).initial, 'high');
  assert.equal(selectDeviceQuality({ ...device, memory: 2 }).initial, 'low');
  assert.equal(selectDeviceQuality({ ...device, cores: 2 }).ceiling, 'low');
  assert.equal(selectDeviceQuality({ ...device, coarse: true, memory: 4 }).initial, 'low');
  assert.equal(selectDeviceQuality({ ...device, coarse: true, width: 390, height: 844, dpr: 3 }).initial, 'high');
  assert.equal(selectDeviceQuality({ ...device, width: 3840, height: 2160, dpr: 2 }).ceiling, 'medium');
  assert.equal(selectDeviceQuality({ ...device, memory: undefined, cores: undefined }).initial, 'medium');
  assert.equal(selectDeviceQuality({ ...device, memory: NaN, cores: Infinity }).initial, 'medium');
});

test('low quality disables shadow passes, limits pixel ratio and distance, and omits ground texture allocations', () => {
  assert.equal(QUALITY.low.shadows, false); assert.equal(QUALITY.medium.shadows, true); assert.equal(QUALITY.high.shadows, true);
  assert(QUALITY.low.dpr <= 1.5);
  assert(QUALITY.low.far < QUALITY.medium.far && QUALITY.medium.far < QUALITY.high.far);
  assert(QUALITY.low.sceneryRange < QUALITY.medium.sceneryRange);
  for (const surface of ['plaster', 'asphalt', 'tile', 'grass']) {
    const material = createSurface(surface, { simple: true });
    assert.equal(material.map, null); assert.equal(material.normalMap, null); assert.equal(material.roughnessMap, null); material.dispose();
  }
});

test('sampling waits for warmup and sustained performance, lowers quality and keeps a cooldown', () => {
  const sampler = new QualitySampler(); let tier = 'high', changes = [];
  for (let frame = 0; frame < 20 * 25; frame++) {
    const change = sampler.sample(1/20, tier, 'high');
    if (change) { tier = change.quality; changes.push({ tier, seconds: frame/20 }); }
  }
  assert.deepEqual(changes.map(change => change.tier), ['medium', 'low']);
  assert(changes[0].seconds >= 5.9); assert(changes[1].seconds - changes[0].seconds >= 11.9);
});

test('upgrades require three fast windows and respect memory ceilings; invalid timings do not cause a jump', () => {
  const sampler = new QualitySampler(); let tier = 'low', changes = [];
  for (let frame = 0; frame < 60 * 45; frame++) {
    const change = sampler.sample(1/60, tier, 'medium');
    if (change) { tier = change.quality; changes.push(tier); }
  }
  assert.deepEqual(changes, ['medium']);
  assert.equal(sampler.sample(NaN, 'medium', 'high'), null);
  assert.equal(sampler.sample(0, 'medium', 'high'), null);
});

test('manual quality always wins over automatic recommendations and can be returned to automatic', () => {
  const original = useVisual.getState();
  try {
    useVisual.getState().setQuality('high');
    useVisual.getState().adaptQuality('low', 12);
    assert.equal(useVisual.getState().quality, 'high'); assert.equal(useVisual.getState().qualityMode, 'manual');
    useVisual.getState().setAutomaticQuality(); useVisual.getState().adaptQuality('low', 12);
    assert.equal(useVisual.getState().qualityMode, 'auto'); assert.equal(useVisual.getState().quality, 'low');
    assert.match(useVisual.getState().qualityReason, /12 FPS/);
  } finally { useVisual.setState(original); }
});
