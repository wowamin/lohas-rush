import test from 'node:test';
import assert from 'node:assert/strict';
import { wheelchairDock, wheelchairLocal, wheelchairCollides, stepWheelchair, WHEELCHAIR_MAX_SPEED, WHEELCHAIR_RADIUS } from '../src/game/vehicle/wheelchairController.ts';
import { PassengerTransfer } from '../src/game/vehicle/passengerTransfer.ts';
import { createVehicle, STEP } from '../src/game/vehicle/drivingPhysics.ts';
import { createPassengerModel } from '../src/game/vehicle/passengerModels.ts';
import { disposeModels } from '../src/game/assets/GameAssets.ts';
import { obstacles, CITY_LIMIT } from '../src/data/city.ts';
import { useGame } from '../src/stores/game.ts';
import { Vector3 } from 'three';
import { WheelchairCameraAvoidance } from '../src/game/camera/wheelchairCamera.ts';
import { constrainCamera } from '../src/game/camera/cameraCollision.ts';
import { CameraBrain } from '../src/game/camera/CameraBrain.ts';

const idle={throttle:0,steer:0,brake:false};
test('wheelchair starts at rotated rear dock, moves independently, turns in place and stops',()=>{
  for (const angle of [0,.7,Math.PI/2,Math.PI]) {
    const bus={x:0,z:32,angle,speed:0}, snapshot={...bus}, chair=wheelchairDock(bus), local=wheelchairLocal(chair,bus);
    assert.ok(Math.abs(local.x)<1e-9 && Math.abs(local.z-4.5)<1e-9 && Math.abs(Math.abs(local.yaw)-Math.PI)<1e-9);
    const before={...chair};
    for(let i=0;i<120;i++) stepWheelchair(chair,{...idle,steer:1},bus,STEP,[],1000);
    assert.equal(chair.x,before.x); assert.equal(chair.z,before.z); assert.ok(chair.angle>before.angle+1.7);
    for(let i=0;i<240;i++) stepWheelchair(chair,{...idle,throttle:1},bus,STEP,[],1000);
    assert.equal(chair.speed,WHEELCHAIR_MAX_SPEED); assert.ok(Math.hypot(chair.x-before.x,chair.z-before.z)>2);
    for(let i=0;i<60;i++) stepWheelchair(chair,{...idle,brake:true},bus,STEP,[],1000);
    assert.equal(chair.speed,0); assert.deepEqual(bus,snapshot);
  }
});

test('wheelchair cannot cross thin walls, parked bus, water or city boundary; reverse escapes',()=>{
  const bus={x:50,z:50,angle:.7};
  const wall={x:0,z:0,halfX:5,halfZ:.02};
  const chair={x:0,z:3,angle:0,speed:WHEELCHAIR_MAX_SPEED};
  for(let i=0;i<600;i++) stepWheelchair(chair,{...idle,throttle:1},bus,STEP,[wall],100);
  assert.ok(chair.z>=wall.halfZ+WHEELCHAIR_RADIUS); assert.equal(chair.speed,0);
  const contact=chair.z;
  for(let i=0;i<120;i++) stepWheelchair(chair,{...idle,throttle:-1},bus,STEP,[wall],100);
  assert.ok(chair.z>contact+.5);
  assert.equal(wheelchairCollides(bus.x,bus.z,bus,[],100),true);
  assert.equal(wheelchairCollides(90,40,bus,obstacles,CITY_LIMIT),true);
  assert.equal(wheelchairCollides(CITY_LIMIT-.1,0,bus,[],CITY_LIMIT),true);
  const edge={x:CITY_LIMIT-2,z:0,angle:-Math.PI/2,speed:WHEELCHAIR_MAX_SPEED};
  for(let i=0;i<300;i++) stepWheelchair(edge,{...idle,throttle:1},bus,STEP,[],CITY_LIMIT);
  assert.ok(edge.x<=CITY_LIMIT-WHEELCHAIR_RADIUS);
});

test('returning requires stopped wheelchair near marker and smoothly aligns its real pose',()=>{
  const machine=new PassengerTransfer(); machine.phase='outside'; const bus=createVehicle();
  assert.match(machine.request(bus,{x:1,z:6,yaw:0,speed:0}),/上車標記/); assert.equal(machine.phase,'outside');
  assert.match(machine.request(bus,{x:0,z:4.5,yaw:0,speed:.5}),/停穩輪椅/);
  const from={x:.2,z:4.6,yaw:1.2,speed:0}; assert.equal(machine.request(bus,from),'');
  assert.equal(machine.phase,'aligning'); assert.equal(machine.pose.grandmaX,from.x); assert.equal(machine.pose.grandmaZ,from.z); assert.equal(machine.pose.grandmaYaw,from.yaw);
  for(let i=0;i<30;i++) machine.step(STEP);
  assert.ok(machine.pose.grandmaX<from.x && machine.pose.grandmaX>0);
  for(let i=0;i<2000 && machine.locked;i++) machine.step(STEP);
  assert.equal(machine.phase,'stowed'); assert.equal(machine.pose.grandmaInside,true);
});

test('reference wheelchair geometry is covered at every heading by the movement collision radius',()=>{
  const character=createPassengerModel('grandma');
  for(const mesh of character.children) {
    const positions=mesh.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++) assert.ok(Math.hypot(positions.getX(i),positions.getZ(i))*.9<=WHEELCHAIR_RADIUS);
  }
  disposeModels([character]);
});

test('chair telemetry keeps parked bus separate and reset restores driving mode and docking data',()=>{
  useGame.getState().reset(); useGame.getState().setTransferStatus('outside');
  useGame.getState().setTelemetry(6,100,30,80,Math.PI); useGame.getState().setBoardingTelemetry(50,0,32);
  assert.equal(useGame.getState().x,30); assert.equal(useGame.getState().parkedBusX,0); assert.equal(useGame.getState().parkedBusZ,32);
  assert.equal(useGame.getState().missionIndex,0);
  useGame.getState().reset(); assert.equal(useGame.getState().boardingDistance,0); assert.equal(useGame.getState().transferPhase,'stowed');
});

test('camera near parked bus keeps the wheelchair visible instead of collapsing inside the head',()=>{
  const target={x:0,z:2.65,angle:Math.PI,speed:0}, position=new Vector3(0,1.1,2.6);
  const blockers=[{min:{x:-1.3,y:0,z:-2.17},max:{x:1.3,y:2.5,z:2.17}}];
  const helper=new WheelchairCameraAvoidance(); assert.equal(helper.apply(position,target,blockers),true);
  assert.ok(position.distanceTo(new Vector3(target.x,1,target.z))>3);
  const before=position.clone(); assert.equal(constrainCamera(new Vector3(target.x,1,target.z),position,blockers),false);
  assert.deepEqual(position.toArray(),before.toArray());
});

test('stationary wheelchair camera converges after unloading instead of cycling alternate shots',()=>{
  for(const fps of [30,60,144])for(const angle of [0,Math.PI/4,Math.PI/2]){
    const bus={x:0,z:32,angle,speed:0},target=wheelchairDock(bus);
    const c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
    const blockers=[{min:{x:-c*1.3-s*2.17,y:0,z:32-s*1.3-c*2.17},max:{x:c*1.3+s*2.17,y:2.5,z:32+s*1.3+c*2.17}}];
    const brain=new CameraBrain(),helper=new WheelchairCameraAvoidance();brain.reset(bus,'service');
    let tailDistance=0,maxStep=0;const previous=brain.position.clone();
    for(let frame=0;frame<fps*10;frame++){
      brain.update(target,1/fps,'wheelchair',blockers,desired=>helper.apply(desired,target,blockers,1/fps,brain.position));
      const moved=brain.position.distanceTo(previous);maxStep=Math.max(maxStep,moved);
      if(frame>fps*6)tailDistance+=moved;
      previous.copy(brain.position);
    }
    assert.ok(tailDistance<.01,`${fps} Hz ${angle}: stationary camera travelled ${tailDistance}`);
    assert.ok(maxStep<1.5,`no frame teleport: ${maxStep}`);
    assert.ok(brain.position.distanceTo(new Vector3(target.x,1,target.z))>3);
    let turnStep=0;
    for(let frame=0;frame<fps*6;frame++){
      target.angle+=1.8/fps;
      brain.update(target,1/fps,'wheelchair',blockers,desired=>helper.apply(desired,target,blockers,1/fps,brain.position));
      turnStep=Math.max(turnStep,brain.position.distanceTo(previous));previous.copy(brain.position);
    }
    assert.ok(turnStep<1.5,`turning in place must not teleport camera: ${turnStep}`);
  }
});
