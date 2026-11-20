import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestLabels } from '../src/game/rendering/nearbyLabels.ts';

test('nearby labels use distance, a maximum of two, and each place radius',()=>{
  const points=[{id:'far',position:[150,0,0]},{id:'near',position:[5,8,0]},{id:'middle',position:[20,0,0]},{id:'shop',position:[24,0,0],radius:23}];
  assert.deepEqual(nearestLabels(points,0,0).map(p=>p.id),['near','middle']);
  assert.deepEqual(nearestLabels(points,0,0,1).map(p=>p.id),['near']);
  assert.equal(nearestLabels(points,0,0,99).length,2);
  assert.deepEqual(nearestLabels(points,999,999),[]);
});
test('label selection is stable, does not mutate world data, and ignores invalid poses',()=>{
  const points=[{id:'b',position:[-4,0,0]},{id:'a',position:[4,0,0]},{id:'invalid',position:[NaN,0,0]}];
  assert.deepEqual(nearestLabels(points,0,0).map(p=>p.id),['a','b']);
  assert.equal(points[0].id,'b');assert.deepEqual(nearestLabels(points,Infinity,0),[]);
});
