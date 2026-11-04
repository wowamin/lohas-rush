import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Mesh } from 'three';
import { PedestrianStreet, streetLayout } from '../src/game/streets/PedestrianStreet.ts';

test('street geometry has finite vertices, a compact draw budget and explicit dimensions', () => {
  const street=new PedestrianStreet(),l=street.layout;
  assert.equal(l.laneWidth,3); assert.equal(l.sidewalkWidth,2.4); assert.equal(l.height,.15);
  assert.ok(Math.abs(l.crossingStart-l.roadEdge-4.5)<1e-10);
  assert.equal(l.rampLength/l.height,12);
  assert.ok(Math.abs(l.laneEdge*2-l.refugeWidth-2*l.laneWidth)<1e-10);
  let draws=0,triangles=0;
  for(const mesh of street.children.filter(child=>child instanceof Mesh)) {
    draws++; const p=mesh.geometry.getAttribute('position'); triangles+=p.count/3;
    for(const number of p.array)assert.ok(Number.isFinite(number));
    assert.ok(mesh.material.roughness>=.9);
  }
  assert.ok(draws<=12,`draws=${draws}`); assert.ok(triangles<20000,`triangles=${triangles}`);
  assert.ok(new Box3().setFromObject(street).min.y>=-.2);
  street.dispose(); assert.equal(street.children.length,0);
});

test('raised crossing surfaces join asphalt and footways continuously on all approaches',()=>{
  const street=new PedestrianStreet(),l=street.layout;
  for(const yaw of [0,Math.PI/2,Math.PI,3*Math.PI/2])for(const x of [-2.4,0,2.4]) {
    const height=z=>street.roadHeightAt(x*Math.cos(yaw)+z*Math.sin(yaw),-x*Math.sin(yaw)+z*Math.cos(yaw));
    assert.ok(Math.abs(height(l.crossingStart-l.rampLength))<1e-10);
    assert.ok(Math.abs(height(l.crossingStart)-.15)<1e-10);
    assert.ok(Math.abs(height(l.crossingEnd)-.15)<1e-10);
    assert.ok(Math.abs(height(l.crossingEnd+l.rampLength))<1e-10);
    assert.ok(Math.abs(height(l.crossingStart-l.rampLength/2)-.075)<1e-10);
  }
  street.dispose();
});

test('navigation leaves clear sidewalks, crossing cut-throughs and lanes while blocking hard objects',()=>{
  const street=new PedestrianStreet(),l=street.layout,n=street.navigation;
  for(const yaw of [0,Math.PI/2,Math.PI,3*Math.PI/2]) {
    const blocked=(x,z,r,actor)=>n.collides(x*Math.cos(yaw)+z*Math.sin(yaw),-x*Math.sin(yaw)+z*Math.cos(yaw),r,actor);
    // Realistic actor circles fit narrow lanes; the game's enclosing 2.45 m
    // van circle is intentionally not reused for a 3 m lane scene.
    for(let z=l.outerEdge+.5;z<l.armLength-1;z+=.25) {
      assert.equal(blocked(2.4,z,.95,'vehicle'),false);
      assert.equal(blocked(l.roadEdge+l.bufferWidth+l.sidewalkWidth/2,z,.45,'pedestrian'),false);
    }
    for(let x=-l.outerEdge+.5;x<l.outerEdge-.5;x+=.2)
      assert.equal(blocked(x,l.crossingCenter,.4,'pedestrian'),false);
    assert.equal(blocked(0,l.crossingCenter,.5,'vehicle'),true);
    assert.equal(blocked(l.laneEdge+.3,l.crossingCenter,.1,'vehicle'),true);
    assert.equal(blocked(0,l.crossingCenter+l.crossingWidth/2+.65,.1,'pedestrian'),true);
  }
  assert.equal(n.sweep(-3,l.crossingCenter,3,l.crossingCenter,.5,'vehicle'),true);
  assert.equal(n.sweep(-3,l.crossingCenter,3,l.crossingCenter,.4,'pedestrian'),false);
  // Sweeps catch a thin bollard even when both endpoints are clear.
  const b=n.boundaries.find(b=>b.id.includes('bollard'));
  assert.equal(n.sweep(b.x-1,b.z,b.x+1,b.z,.1,'pedestrian'),true);
  street.position.set(100,2,-70);street.rotation.y=.37;street.updateMatrixWorld(true);
  const x=100+2.4*Math.cos(.37)+l.crossingCenter*Math.sin(.37);
  const z=-70-2.4*Math.sin(.37)+l.crossingCenter*Math.cos(.37);
  assert.equal(n.collides(x,z,.95,'vehicle'),false);
  assert.equal(n.collides(100+l.crossingCenter*Math.sin(.37),-70+l.crossingCenter*Math.cos(.37),.5,'vehicle'),true);
  street.dispose();
});

test('unsafe and unbounded configurations fail before building geometry',()=>{
  for(const options of [{sidewalkWidth:1.9},{treeSpacing:0},{laneWidth:8},{armLength:10},{crossingSetback:3},{armLength:Infinity}])
    assert.throws(()=>streetLayout(options),RangeError);
});
