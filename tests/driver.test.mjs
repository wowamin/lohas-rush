import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3,Box3 } from 'three';
import { driverPose,DRIVER_OPERATOR } from '../src/game/vehicle/driverAssistance.ts';
import { createDriverModel,poseDriver } from '../src/game/vehicle/driverModel.ts';
import { PassengerTransfer,transferAreaClear,transferDurations,transferPose } from '../src/game/vehicle/passengerTransfer.ts';
import { DRIVER_CHAIR_OFFSET } from '../src/game/vehicle/transferPath.ts';
import { wheelchairCollides } from '../src/game/vehicle/wheelchairController.ts';
import { createVehicle,STEP } from '../src/game/vehicle/drivingPhysics.ts';
import { createServiceVanFallback } from '../src/game/vehicle/serviceVan.ts';
import { disposeModels } from '../src/game/assets/GameAssets.ts';
import {createCaregiverModel,poseCaregiver} from '../src/game/vehicle/caregiverModel.ts';
import {caregiverPose} from '../src/game/vehicle/caregiverPose.ts';

test('both front occupants clear the fixed seat backs throughout entry and exit',()=>{
  const driver=createDriverModel(),caregiver=createCaregiverModel(),point=new Vector3();
  const backs=[-.55,.55].map(x=>new Box3(new Vector3(x-.239,.981,-.789),new Vector3(x+.239,1.679,-.616)));
  try{
    for(const phase of ['driverExit','driverEnter'])for(let step=0;step<=40;step++)for(const stride of [0,Math.PI/2]){
      const progress=step/40,pose=driverPose(phase,progress),helper=caregiverPose(phase,progress,{x:0,z:4.5,yaw:Math.PI});
      poseDriver(driver,pose,stride/10);poseCaregiver(caregiver,stride,helper.walking,helper.grip,helper.seated);
      for(const [model,position]of [[driver,pose],[caregiver,helper]]){
        model.root.position.set(position.x,position.y,position.z);model.root.rotation.y=position.yaw;model.root.updateMatrixWorld(true);
        model.root.traverse(mesh=>{
          if(!mesh.isMesh)return;const vertices=mesh.geometry.getAttribute('position');
          for(let i=0;i<vertices.count;i++){
            point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
            if(backs.some(back=>back.containsPoint(point)))assert.fail(`${model.root.name} intersects seat back at ${phase} ${progress}: ${point.toArray()}`);
          }
        });
      }
    }
  }finally{disposeModels([driver.root,caregiver.root]);}
});

test('driver reaches controls before hatch opens, operates lift while occupied and returns before driving unlocks',()=>{
  const machine=new PassengerTransfer();machine.request(createVehicle());
  let outside=false,returned=false;
  for(let i=0;i<7000;i++){
    const pose=machine.pose,driver=driverPose(machine.phase,machine.progress);
    if(machine.phase==='driverExit'||machine.phase==='driverWalk') {assert.equal(pose.hatch,0);assert.equal(pose.grandmaInside,true);assert.equal(machine.locked,true);}
    if(['opening','deploying','lowering','raising','folding','closing'].includes(machine.phase)){
      assert.equal(driver.operate,1);assert.equal(driver.x,DRIVER_OPERATOR.x);assert.equal(driver.z,DRIVER_OPERATOR.z);
    }
    if(machine.phase==='outside'&&!outside){outside=true;assert.equal(driver.seated,0);machine.request(createVehicle());}
    if(machine.phase==='driverReturn'||machine.phase==='driverEnter'){returned=true;assert.equal(pose.hatch,0);assert.equal(pose.fold,1);assert.equal(machine.locked,true);}
    machine.step(STEP);
    if(outside&&machine.phase==='stowed')break;
  }
  assert.ok(outside&&returned);assert.equal(machine.phase,'stowed');assert.equal(driverPose('stowed').seated,1);
});

test('driver paths and driver door are continuous and stay outside the van during the walk',()=>{
  const transitions=[['stowed','driverExit'],['driverExit','driverWalk'],['driverWalk','opening'],['closing','driverReturn'],['driverReturn','driverEnter'],['driverEnter','stowed']];
  for(const [from,to]of transitions){
    const a=driverPose(from,1),b=driverPose(to,0);
    for(const field of ['x','y','z','seated','door'])assert.ok(Math.abs(a[field]-b[field])<1e-8,`${from}->${to} ${field}`);
    assert.ok(Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)))<1e-8,`${from}->${to} orientation`);
  }
  for(const phase of ['driverWalk','driverReturn'])for(let i=0;i<=100;i++){
    const pose=driverPose(phase,i/100);
    assert.ok(pose.x<=-1.3);assert.ok(pose.z<=2.6+.00001);assert.equal(pose.y,.14);
  }
});

test('driver model has visible uniform/cap and animated limbs, fits cabin while seated and blocks wheelchair when waiting',()=>{
  const model=createDriverModel();
  poseDriver(model,driverPose('stowed'),0);model.root.updateMatrixWorld(true);
  const seated=new Box3().setFromObject(model.root);assert.ok(seated.max.y+.75<2.3);
  const handBefore=model.elbows[1].rotation.x;
  poseDriver(model,driverPose('lowering',.5),.3);assert.notEqual(model.elbows[1].rotation.x,handBefore);
  poseDriver(model,driverPose('outside'),0);model.root.updateMatrixWorld(true);
  const point=new Vector3();model.root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const positions=mesh.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);assert.ok(Math.hypot(point.x,point.z)<=DRIVER_OPERATOR.radius);}
  });
  assert.equal(wheelchairCollides(DRIVER_OPERATOR.x,DRIVER_OPERATOR.z,{x:0,z:0,angle:0},[],100),true);
  const van=createServiceVanFallback();assert.ok(van.getObjectByName('driverDoor'));
  disposeModels([model.root,van]);
});

test('driver route refuses a blocked side and reset clears every added driver phase',()=>{
  assert.equal(transferAreaClear({x:0,z:0,angle:0},[{x:-1.85,z:.5,halfX:.05,halfZ:.05}],100),false);
  assert.equal(transferAreaClear({x:0,z:0,angle:0},[],100),true);
  for(const phase of Object.keys(transferDurations)){
    const machine=new PassengerTransfer();machine.phase=phase;machine.elapsed=.4;machine.reset();
    assert.equal(machine.phase,'stowed');assert.deepEqual(driverPose(machine.phase,machine.progress),driverPose('stowed'));
  }
});

test('driver enters the open cabin, keeps both hands on the moving chair, then clears the lift before lowering',()=>{
  const machine=new PassengerTransfer(),model=createDriverModel();machine.request(createVehicle());
  let entered=false,pulled=false,secured=false,steppedDown=false;
  try{
    for(let i=0;i<4000&&machine.phase!=='outside';i++){
      const chair=machine.pose,driver=driverPose(machine.phase,machine.progress);
      if(machine.phase==='driverGrip'){
        entered=true;assert.equal(driver.y,.75);assert.ok(driver.z<2);assert.equal(chair.grandmaZ,.42);
      }
      if(machine.phase==='rollingOut'||machine.phase==='exiting'){
        pulled=true;assert.equal(driver.grip,1);assert.equal(driver.y,chair.grandmaY);assert.equal(chair.deckY,machine.phase==='rollingOut'?.75:.14);
        assert.ok(Math.abs(driver.x-chair.grandmaX)<1e-9);assert.ok(Math.abs(driver.z-chair.grandmaZ-DRIVER_CHAIR_OFFSET)<1e-9);
        // Test rendered hand positions, including gait, rather than only roots.
        poseDriver(model,driver,i/120);model.root.position.set(driver.x,driver.y,driver.z);model.root.rotation.y=driver.yaw;model.root.updateMatrixWorld(true);
        for(let side=0;side<2;side++){
          const hand=model.elbows[side].localToWorld(new Vector3(0,-.195,.008));
          const handle=new Vector3(chair.grandmaX+(side===0?.198:-.198),chair.grandmaY+.756,chair.grandmaZ+.27);
          assert.ok(hand.distanceTo(handle)<.025,'hands remain on wheelchair handles throughout the pull');
        }
      }
      if(machine.phase==='driverSecure'){secured=true;assert.equal(chair.grandmaZ,2.75);assert.equal(chair.deckY,.75);}
      if(machine.phase==='driverStepDown'){steppedDown=true;assert.equal(chair.grandmaZ,2.75);assert.equal(chair.deckY,.75);}
      if(machine.phase==='lowering'){
        assert.ok(entered&&pulled&&secured&&steppedDown);assert.equal(driver.y,.14);assert.equal(driver.operate,1);
      }
      machine.step(STEP);
    }
    assert.equal(machine.phase,'outside');
  }finally{disposeModels([model.root]);}
});

test('assisted boarding and unloading poses join continuously at every new phase boundary',()=>{
  const order=['deploying','driverClimb','driverGrip','rollingOut','driverSecure','driverStepDown','lowering','driverDeckApproach','driverDeckGrip','exiting','driverGroundStop','driverHandoff','driverBackToControls','outside'];
  const returning=['raising','driverBoard','driverGripIn','rollingIn','driverRelease','driverLeave','folding'];
  for(const chain of [order,returning])for(let i=0;i<chain.length-1;i++){
    const a=driverPose(chain[i],1),b=driverPose(chain[i+1],0);
    for(const field of ['x','y','z','seated','door','grip','crouch'])assert.ok(Math.abs(a[field]-b[field])<1e-8,`${chain[i]} -> ${chain[i+1]}: ${field}`);
    assert.ok(Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)))<1e-8);
  }
  for(const phase of ['rollingOut','rollingIn'])for(let i=0;i<=100;i++){
    const chair=transferPose(phase,i/100),driver=driverPose(phase,i/100);
    assert.equal(driver.grip,1);assert.ok(Math.abs(driver.z-chair.grandmaZ-DRIVER_CHAIR_OFFSET)<1e-8);
    assert.ok(Math.abs(chair.grandmaX-.43)>.65||chair.grandmaZ-.3>.75,'clear grandpa before moving sideways through the cabin');
  }
});
