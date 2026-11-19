import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3} from 'three';
import {centerCampuses,campusPoint,campusArrivalNode,campusReservations,CAMPUS_BOULEVARD_OFFSET} from '../src/data/centerCampuses.ts';
import {locations,obstacles,streetFurniture} from '../src/data/city.ts';
import {roads,nodeById,roadNodes,findRoadRoute,CITY_LIMIT} from '../src/data/roadNetwork.ts';
import {collides} from '../src/game/collision/collisionSystem.ts';
import {transferAreaClear} from '../src/game/vehicle/passengerTransfer.ts';
import {wheelchairCollides} from '../src/game/vehicle/wheelchairController.ts';
import {createCampusModel} from '../src/game/buildings/campusModel.ts';
import {disposeModels} from '../src/game/assets/GameAssets.ts';

test('five campuses have navigable two-ended loops, clear parking, and distinct reserved land',()=>{
  assert.deepEqual(centerCampuses.map(s=>s.id),locations.map(l=>l.id));
  assert.equal(new Set(roadNodes.map(n=>n.id)).size,roadNodes.length);
  assert.equal(new Set(roadNodes.map(n=>n.point.join(','))).size,roadNodes.length);
  for(const site of centerCampuses){
    const location=locations.find(l=>l.id===site.id);
    assert.deepEqual(nodeById.get(campusArrivalNode(site)).point,location.arrival);
    assert(findRoadRoute('0-0',location.roadNode).length>1);
    for(const side of [-1,1]){
      const point=campusPoint(site,side*32,CAMPUS_BOULEVARD_OFFSET);
      const entrance=roadNodes.find(n=>n.point[0]===point[0]&&n.point[1]===point[1]);
      assert(entrance);
      assert.equal(roads.filter(r=>r.from===entrance.id||r.to===entrance.id).length,3,'each entrance joins both boulevard directions');
    }
    for(const x of site.parkingXs)assert.equal(collides(...campusPoint(site,x,58)),false,'parking has no hidden collision');
    const reserve=campusReservations[centerCampuses.indexOf(site)];
    assert(Math.abs(reserve.x)+reserve.halfX<CITY_LIMIT&&Math.abs(reserve.z)+reserve.halfZ<CITY_LIMIT);
    assert(!streetFurniture.some(f=>Math.abs(f.x-reserve.x)<reserve.halfX&&Math.abs(f.z-reserve.z)<reserve.halfZ),'no automatic trees or poles in maneuvering space');
    if(['longshan','yihe'].includes(site.id)){assert.equal(site.parkingXs.length,6);assert(site.courtHalfWidth>=46);}
  }
});

test('arrival circle, assistance envelope and wheelchair approach are clear at each new center',()=>{
  for(const site of centerCampuses){
    const [x,z]=campusPoint(site,0,40),bus={x,z,angle:site.rotation-Math.PI/2,speed:0};
    for(let a=0;a<Math.PI*2;a+=Math.PI/8){
      const parked={...bus,x:x+Math.cos(a)*4,z:z+Math.sin(a)*4};
      assert.equal(collides(parked.x,parked.z),false,site.id);
      for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2])assert.equal(transferAreaClear({...parked,angle}),true,`${site.id} full arrival zone supports transfers`);
    }
    const path=[[-8,40],[-8,24],[0,24],[0,15]];
    for(let i=1;i<path.length;i++){
      const a=campusPoint(site,...path[i-1]),b=campusPoint(site,...path[i]);
      const angle=Math.atan2(-(b[0]-a[0]),-(b[1]-a[1]));
      for(let t=0;t<=1;t+=.025)assert.equal(wheelchairCollides(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,bus,obstacles,CITY_LIMIT,angle),false,`${site.id} chair and caregiver can approach the forecourt`);
    }
  }
});

test('all declared road centerlines remain collision-free, including bridges and campus loops',()=>{
  for(const road of roads){
    const a=nodeById.get(road.from).point,b=nodeById.get(road.to).point,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    assert(length>0);
    const samples=Math.ceil(length);
    for(let i=0;i<=samples;i++)assert.equal(collides(a[0]+(b[0]-a[0])*i/samples,a[1]+(b[1]-a[1])*i/samples),false,`${road.from} -> ${road.to}`);
  }
});

test('campus scenery is finite, batched and leaves the pickup lane physically flat',()=>{
  for(const site of centerCampuses){
    const model=createCampusModel(site);
    try{
      assert.equal(model.userData.parkingSpaces,site.parkingXs.length);
      assert(model.children.length<=5);
      for(const mesh of model.children){
        assert(Array.from(mesh.geometry.getAttribute('position').array).every(Number.isFinite));
        assert(Array.from(mesh.geometry.getAttribute('normal').array).every(Number.isFinite));
      }
      const bounds=new Box3().setFromObject(model);
      assert(bounds.min.x>=-site.courtHalfWidth-1e-5&&bounds.max.x<=site.courtHalfWidth+1e-5);
      assert(bounds.min.z>=-16-1e-5&&bounds.max.z<=72+1e-5);
    }finally{disposeModels([model]);}
  }
});
