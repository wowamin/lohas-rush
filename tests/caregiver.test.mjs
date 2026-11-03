import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {caregiverPose,caregiverBehind,CAREGIVER_OFFSET,CAREGIVER_RADIUS,CAREGIVER_WAIT} from '../src/game/vehicle/caregiverPose.ts';
import {createCaregiverModel,poseCaregiver} from '../src/game/vehicle/caregiverModel.ts';
import {wheelchairCollides,stepWheelchair,WHEELCHAIR_RADIUS} from '../src/game/vehicle/wheelchairController.ts';
import {transferAreaClear} from '../src/game/vehicle/passengerTransfer.ts';
import {disposeModels} from '../src/game/assets/GameAssets.ts';
import {PassengerTransfer} from '../src/game/vehicle/passengerTransfer.ts';
import {createVehicle,STEP} from '../src/game/vehicle/drivingPhysics.ts';
import {createServiceVanFallback} from '../src/game/vehicle/serviceVan.ts';

test('caregiver remains behind the chair at every heading and smoothly takes/releases the grips',()=>{
  for(let i=0;i<32;i++){
    const chair={x:10,z:20,yaw:i*Math.PI/16},pose=caregiverPose('outside',0,chair),behind=caregiverBehind(chair.x,chair.z,chair.yaw);
    assert.ok(Math.abs(pose.x-behind.x)<1e-8 && Math.abs(pose.z-behind.z)<1e-8);
    assert.ok(Math.abs(Math.hypot(pose.x-chair.x,pose.z-chair.z)-CAREGIVER_OFFSET)<1e-8);
    assert.ok(Math.abs(Math.sin(pose.yaw-chair.yaw))<1e-8);
    const handoff=caregiverPose('exiting',1,chair),release=caregiverPose('aligning',0,chair);
    for(const key of Object.keys(pose)){assert.ok(Math.abs(handoff[key]-pose[key])<1e-8);assert.ok(Math.abs(release[key]-pose[key])<1e-8);}
    const wait=caregiverPose('aligning',1,chair);assert.equal(wait.x,CAREGIVER_WAIT.x);assert.equal(wait.z,CAREGIVER_WAIT.z);assert.equal(wait.grip,0);
  }
});

test('reference caregiver has animated steps and the wheelchair/caregiver collision union covers every vertex',()=>{
  const model=createCaregiverModel(),point=new Vector3();
  poseCaregiver(model,Math.PI/2,1,1);assert.notEqual(model.legs[0].rotation.x,model.legs[1].rotation.x);assert.equal(model.arms.rotation.x,0);
  for(const stride of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    poseCaregiver(model,stride,1,1);model.root.updateMatrixWorld(true);
    model.root.traverse(mesh=>{
      if(!mesh.isMesh)return;const vertices=mesh.geometry.getAttribute('position');
      for(let i=0;i<vertices.count;i++){
        point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
        assert.ok(Math.hypot(point.x,point.z)<=CAREGIVER_RADIUS || Math.hypot(point.x,point.z-CAREGIVER_OFFSET)<=WHEELCHAIR_RADIUS,'body or pushing hands stay within the combined footprint');
      }
    });
  }
  disposeModels([model.root]);
});

test('companion body blocks translation and turning near obstacles, and unloading reserves the handover space',()=>{
  const bus={x:50,z:50,angle:0},wall=[{x:0,z:.95,halfX:5,halfZ:.01}];
  // The chair itself is clear; its attendant behind it is obstructed.
  assert.equal(wheelchairCollides(0,0,bus,wall,100,0),true);
  assert.equal(wheelchairCollides(0,0,bus,wall,100,Math.PI/2),false);
  const chair={x:0,z:0,angle:Math.PI/2,speed:0};
  for(let i=0;i<300;i++)stepWheelchair(chair,{throttle:0,steer:-1,brake:true},bus,1/120,wall,100);
  assert.ok(chair.angle>.1);assert.equal(wheelchairCollides(chair.x,chair.z,bus,wall,100,chair.angle),false);
  assert.equal(transferAreaClear({x:0,z:0,angle:0},[{x:1.8,z:4.5,halfX:.05,halfZ:.05}],100),false);
});

test('caregiver exits and returns through the right side, seated before driving can resume',()=>{
  const chair={x:0,z:4.5,yaw:Math.PI};
  const links=[['stowed','driverExit'],['driverExit','driverWalk'],['driverWalk','opening'],['closing','driverReturn'],['driverReturn','driverEnter'],['driverEnter','stowed']];
  for(const[from,to]of links){
    const a=caregiverPose(from,1,chair),b=caregiverPose(to,0,chair);
    for(const key of ['x','y','z','seated','door'])assert.ok(Math.abs(a[key]-b[key])<1e-8,`${from} to ${to}: ${key}`);
    assert.ok(Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)))<1e-8);
  }
  for(const phase of ['driverWalk','driverReturn'])for(let i=0;i<=100;i++)assert.ok(caregiverPose(phase,i/100,chair).x>=1.55);
  const machine=new PassengerTransfer();machine.request(createVehicle());let boarded=false;
  for(let i=0;i<6000;i++){
    if(machine.phase==='outside'&&!boarded){boarded=true;machine.request(createVehicle());}
    if(machine.phase==='driverReturn'||machine.phase==='driverEnter')assert.equal(machine.locked,true);
    machine.step(STEP);if(boarded&&machine.phase==='stowed')break;
  }
  assert.equal(machine.phase,'stowed');assert.equal(caregiverPose('stowed',0,chair).seated,1);
  assert.equal(transferAreaClear({x:0,z:0,angle:0},[{x:1.9,z:-.8,halfX:.05,halfZ:.05}],100),false);
});

test('seated copilot bends her knees and her head stays within the enlarged front cabin',()=>{
  const model=createCaregiverModel(),pose=caregiverPose('stowed',0,{x:0,z:4.5,yaw:Math.PI}),point=new Vector3();
  poseCaregiver(model,0,0,0,pose.seated);assert.equal(model.knees[0].rotation.x,Math.PI/2);
  model.root.position.set(pose.x,pose.y,pose.z);model.root.rotation.y=pose.yaw;model.root.updateMatrixWorld(true);
  model.root.traverse(mesh=>{
    if(!mesh.isMesh)return;const positions=mesh.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
      assert.ok(Math.abs(point.x)<1.02 && point.y<2.35);
      if(point.y>1.75){const glassZ=-2.05+(point.y-1.5)*.4/.85;assert.ok(point.z-glassZ>.12);}
    }
  });const van=createServiceVanFallback();assert.ok(van.getObjectByName('passengerDoor'));disposeModels([model.root,van]);
});
