import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3 } from 'three';
import { PassengerTransfer, transferPose, transferDurations, transferAreaClear } from '../src/game/vehicle/passengerTransfer.ts';
import { createPassengerModel } from '../src/game/vehicle/passengerModels.ts';
import { createServiceVanFallback } from '../src/game/vehicle/serviceVan.ts';
import { createVehicle, STEP } from '../src/game/vehicle/drivingPhysics.ts';
import { disposeModels } from '../src/game/assets/GameAssets.ts';
import { useGame } from '../src/stores/game.ts';
import { CITY_LIMIT } from '../src/data/city.ts';

function advance(machine, until, limit = 3000) {
  let steps = 0;
  while (machine.phase !== until && steps++ < limit) machine.step(STEP);
  assert.equal(machine.phase, until);
}

test('ordered transfer opens hatch, deploys, moves grandma and lowers before exit; grandpa remains reserved onboard', () => {
  const machine = new PassengerTransfer();
  assert.equal(machine.request(createVehicle()), '');
  const phases = [machine.phase];
  for (let i = 0; i < 4000 && machine.phase !== 'outside'; i++) {
    const before = machine.phase, pose = machine.pose;
    assert.equal(pose.grandmaYaw,Math.PI,'grandma faces forward throughout unloading');
    assert.ok(pose.deckY >= .14 - 1e-9 && pose.deckY <= .75 + 1e-9);
    assert.ok(Number.isFinite(pose.grandmaZ));
    if (before === 'lowering') assert.equal(pose.grandmaY,pose.deckY);
    machine.step(STEP); if (machine.phase !== before) phases.push(machine.phase);
  }
  assert.deepEqual(phases,['driverExit','driverWalk','opening','deploying','driverClimb','driverGrip','rollingOut','driverSecure','driverStepDown','lowering','driverDeckApproach','driverDeckGrip','exiting','driverGroundStop','driverHandoff','driverBackToControls','outside']);
  assert.equal(machine.pose.grandmaInside,false); assert.equal(machine.pose.grandmaZ,4.5);
  assert.equal(machine.locked,true); assert.equal(machine.pose.hatch,1);
});

test('boarding reverses path, raises occupied platform, folds and closes before driving unlocks', () => {
  const machine = new PassengerTransfer(); machine.request(createVehicle()); advance(machine,'outside');
  assert.equal(machine.request(createVehicle()), '');
  const phases = [machine.phase];
  for (let i=0;i<4000 && machine.locked;i++) {
    const before = machine.phase; machine.step(STEP); if (machine.phase !== before) phases.push(machine.phase);
  }
  assert.deepEqual(phases,['aligning','boarding','raising','driverBoard','driverGripIn','rollingIn','driverRelease','driverLeave','folding','closing','driverReturn','driverEnter','stowed']);
  assert.equal(machine.pose.grandmaInside,true); assert.equal(machine.pose.hatch,0);
  assert.equal(machine.pose.fold,1); assert.equal(machine.pose.grandmaYaw,Math.PI);
});

test('poses are continuous at every phase boundary and reset is deterministic at all stages', () => {
  const order = ['stowed','driverExit','driverWalk','opening','deploying','driverClimb','driverGrip','rollingOut','driverSecure','driverStepDown','lowering','driverDeckApproach','driverDeckGrip','exiting','driverGroundStop','driverHandoff','driverBackToControls','outside','aligning','boarding','raising','driverBoard','driverGripIn','rollingIn','driverRelease','driverLeave','folding','closing','driverReturn','driverEnter','stowed'];
  for (let i=0;i<order.length-1;i++) {
    const a = transferPose(order[i],1), b = transferPose(order[i+1],0);
    for (const key of ['hatch','fold','deckY','grandmaX','grandmaY','grandmaZ','grandmaYaw']) assert.ok(Math.abs(a[key]-b[key])<1e-8, `${order[i]} -> ${order[i+1]}: ${key}`);
  }
  for (const phase of order) {
    const machine = new PassengerTransfer(); machine.phase = phase; machine.elapsed = .4; machine.reset();
    assert.equal(machine.locked,false); assert.deepEqual(machine.pose,transferPose('stowed'));
  }
  const a = new PassengerTransfer(), b = new PassengerTransfer(); a.request(createVehicle()); b.request(createVehicle());
  for(let i=0;i<900;i++) { a.step(STEP); b.step(STEP); } assert.deepEqual(a,b);
});

test('moving van cannot unload; rotated rear envelope refuses obstacles, water and city boundary', () => {
  const machine = new PassengerTransfer();
  assert.match(machine.request({...createVehicle(),speed:1}), /停妥/); assert.equal(machine.phase,'stowed');
  for (const angle of [0,Math.PI/4,Math.PI/2,Math.PI,-Math.PI/2]) {
    const vehicle = {x:0,z:0,angle};
    const rear = {x:Math.sin(angle)*4,z:Math.cos(angle)*4,halfX:.3,halfZ:.3};
    assert.equal(transferAreaClear(vehicle,[rear],100),false);
    assert.equal(transferAreaClear(vehicle,[{...rear,x:50,z:50}],100),true);
  }
  assert.equal(transferAreaClear({x:0,z:98,angle:0},[],100),false);
  assert.equal(transferAreaClear(createVehicle()),true);
  assert.match(machine.request({...createVehicle(),z:CITY_LIMIT-3}), /空間不足/);
  assert.match(machine.request({...createVehicle(),x:90,z:30}), /空間不足/);
});

test('both reference-based wheelchair characters fit cabin height and are independent 3D models', () => {
  const characters = ['grandma','grandpa'].map(createPassengerModel);
  for (const character of characters) {
    const bounds = new Box3().setFromObject(character);
    assert.ok(bounds.max.y*.9+.75<2.15,'heads clear rear doorway');
    assert.ok(bounds.max.x-bounds.min.x<.8); assert.ok(character.children.length<25,'material batches control draw calls');
    assert.ok(character.children.every(child => child.isMesh));
  }
  assert.notEqual(characters[0].children[0].geometry,characters[1].children[0].geometry);
  const van = createServiceVanFallback(); assert.ok(van.getObjectByName('rearHatch'));
  assert.ok(van.getObjectByName('van-glass').material.transparent);
  disposeModels([...characters,van]);
});

test('low-frequency transfer UI state resets without affecting deterministic mission order', () => {
  useGame.getState().reset(); useGame.getState().requestTransfer();
  useGame.getState().setTransferStatus('outside');
  assert.equal(useGame.getState().missionIndex,0); assert.equal(useGame.getState().transferRequest,1);
  useGame.getState().reset(); assert.equal(useGame.getState().transferPhase,'stowed'); assert.equal(useGame.getState().transferRequest,0);
});
