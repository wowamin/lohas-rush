import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {MouseOrbit,MIN_CAMERA_DISTANCE,MAX_CAMERA_DISTANCE} from '../src/game/camera/MouseOrbit.ts';
import {CameraBrain} from '../src/game/camera/CameraBrain.ts';

test('mouse orbit covers a full circle, clamps elevation and ignores movement after release',()=>{
  const orbit=new MouseOrbit(),target={x:0,z:0,angle:0,speed:0},position=new Vector3(0,5,10),start=position.clone();
  orbit.begin(position,target,1,0,0);
  for(let i=1;i<=4;i++){
    orbit.move(i*Math.PI/2/.005,0);orbit.apply(position,target,1);
    const expected=-i*Math.PI/2;
    assert.ok(Math.abs(position.x-Math.sin(expected)*10)<1e-8);
    assert.ok(Math.abs(position.z-Math.cos(expected)*10)<1e-8);
  }
  assert.ok(position.distanceTo(start)<1e-8);
  orbit.move(0,1e5);orbit.apply(position,target,1);assert.ok(Number.isFinite(position.y)&&orbit.pitch<Math.PI/2);
  orbit.move(0,-1e5);orbit.apply(position,target,1);assert.ok(position.y>1);
  orbit.end();const yaw=orbit.yaw;orbit.move(999,999);assert.equal(orbit.yaw,yaw);
});

test('manual camera follows a moving target, respects blockers and clears on mode/reset',()=>{
  const target={x:0,z:0,angle:0,speed:0},brain=new CameraBrain();brain.reset(target);
  brain.orbit.begin(brain.position,target,brain.aimHeight,0,0);brain.orbit.move(300,50);brain.orbit.end();
  for(let i=0;i<180;i++)brain.update(target,1/60,'chase');
  const before=brain.position.clone();target.x+=10;
  for(let i=0;i<240;i++)brain.update(target,1/60,'chase');
  assert.ok(Math.abs(brain.position.x-before.x-10)<.001);
  assert.equal(brain.orbit.active,true);
  brain.update(target,1/60,'overview');assert.equal(brain.orbit.active,false);
  brain.orbit.begin(brain.position,target,brain.aimHeight,0,0);brain.reset(target);assert.equal(brain.orbit.dragging,false);assert.equal(brain.orbit.active,false);
  const wall={min:{x:-4,y:0,z:6},max:{x:4,y:20,z:8}};
  target.x=0;brain.reset(target);brain.orbit.begin(brain.position,target,brain.aimHeight,0,0);
  brain.update(target,1/60,'chase',[wall]);assert.ok(brain.position.z<5.6);
});

test('wheel zoom is bounded, keeps the selected view and does not start dragging',()=>{
  const orbit=new MouseOrbit(),target={x:0,z:0,angle:0,speed:0},position=new Vector3(0,5,10);
  orbit.zoom(-120,position,target,1);const near=orbit.radius,yaw=orbit.yaw,pitch=orbit.pitch;
  assert.ok(near<Math.hypot(5-1,10));assert.equal(orbit.dragging,false);
  orbit.zoom(240,position,target,1);assert.ok(orbit.radius>near);assert.equal(orbit.yaw,yaw);assert.equal(orbit.pitch,pitch);
  for(let i=0;i<50;i++)orbit.zoom(-100000,position,target,1);assert.equal(orbit.radius,MIN_CAMERA_DISTANCE);
  for(let i=0;i<50;i++)orbit.zoom(100000,position,target,1);assert.equal(orbit.radius,MAX_CAMERA_DISTANCE);
  orbit.zoom(NaN,position,target,1);assert.equal(orbit.radius,MAX_CAMERA_DISTANCE);
  orbit.begin(position,target,1,100,100);orbit.zoom(-120,position,target,1);assert.equal(orbit.dragging,true);
  orbit.move(200,100);assert.ok(orbit.yaw<yaw);orbit.reset();assert.equal(orbit.active,false);
});
