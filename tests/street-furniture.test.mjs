import test from 'node:test';
import assert from 'node:assert/strict';
import {streetFurniture,buildings,locations,obstacles} from '../src/data/city.ts';
import {servicePoints} from '../src/data/services.ts';
import {roads,nodeById,SPAWN} from '../src/data/roadNetwork.ts';
import {distanceToRoad,FURNITURE_CLEARANCE,SIDEWALK_WIDTH} from '../src/data/streetFurniture.ts';
import {transferAreaClear} from '../src/game/vehicle/passengerTransfer.ts';

test('trees and streetlights occupy separate curb positions, with lamp arms aimed at the carriageway',()=>{
  assert.ok(streetFurniture.filter(f=>f.kind==='tree').length>20);
  assert.ok(streetFurniture.filter(f=>f.kind==='streetlight').length>20);
  for(const fixture of streetFurniture){
    const road=roads[fixture.roadIndex],distance=distanceToRoad(fixture.x,fixture.z,fixture.roadIndex);
    assert.ok(distance>road.width/2+.5&&distance<road.width/2+SIDEWALK_WIDTH-1,'fixtures leave a continuous outer footway');
    if(fixture.kind==='streetlight'){
      const arm={x:fixture.x+1.25*Math.cos(fixture.rotation),z:fixture.z-1.25*Math.sin(fixture.rotation)};
      assert.ok(distanceToRoad(arm.x,arm.z,fixture.roadIndex)<distance,'lamp illuminates the road');
    }
    for(const other of streetFurniture)if(fixture.kind!==other.kind)assert.ok(Math.hypot(fixture.x-other.x,fixture.z-other.z)>=FURNITURE_CLEARANCE,'tree canopy cannot engulf a lamp');
    for(const b of buildings)assert.ok(Math.hypot(Math.max(0,Math.abs(fixture.x-b.x)-b.halfX),Math.max(0,Math.abs(fixture.z-b.z)-b.halfZ))>(fixture.kind==='tree'?2.39:.84),'building frontages remain clear');
    assert.ok(obstacles.some(o=>o.kind===fixture.kind&&o.x===fixture.x&&o.z===fixture.z),'trunks and poles have matching collision');
  }
});

test('street furniture stays out of intersecting carriageways, arrival zones and the full transfer envelope',()=>{
  const entrances=[...locations.map(l=>l.arrival),...servicePoints.map(s=>s.arrival),[SPAWN.x,SPAWN.z]];
  for(const fixture of streetFurniture){
    for(let index=0;index<roads.length;index++)assert.ok(distanceToRoad(fixture.x,fixture.z,index)>roads[index].width/2+.47,'cross streets remain clear');
    for(const [x,z] of entrances)assert.ok(Math.hypot(fixture.x-x,fixture.z-z)>=10);
  }
  const blockers=obstacles.filter(o=>o.kind==='tree'||o.kind==='streetlight');
  for(const [x,z]of entrances)for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2])assert.equal(transferAreaClear({x,z,angle},blockers),true,'all headings have room to assist passengers');
  // The long outer streets receive fixtures too, rather than only downtown.
  assert.ok(streetFurniture.some(f=>Math.abs(f.x)>450||Math.abs(f.z)>450));
  assert.ok(nodeById.size>0);
});
