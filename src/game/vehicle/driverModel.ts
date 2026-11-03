import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DriverPose } from './driverAssistance.ts';

function batch(build:(add:(shape:THREE.BufferGeometry,color:string,position:[number,number,number],scale?:[number,number,number],rotation?:[number,number,number])=>void)=>void) {
  const colors=new Map<string,THREE.BufferGeometry[]>();
  const add=(shape:THREE.BufferGeometry,color:string,p:[number,number,number],s:[number,number,number]=[1,1,1],r:[number,number,number]=[0,0,0])=>{
    const geometry=shape.index?shape.toNonIndexed():shape.clone();shape.dispose();geometry.deleteAttribute('uv');
    const transform=new THREE.Object3D();transform.position.set(...p);transform.scale.set(...s);transform.rotation.set(...r);transform.updateMatrix();geometry.applyMatrix4(transform.matrix);
    const items=colors.get(color)??[];items.push(geometry);colors.set(color,items);
  };
  build(add);const group=new THREE.Group();
  for(const [color,parts] of colors){const geometry=mergeGeometries(parts);parts.forEach(part=>part.dispose());const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.8}));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
  return group;
}

// Geometry approximation of the supplied blue-uniform driver sheet; no image planes or tiny lettering.
export function createDriverModel() {
  const skin='#edb58b',navy='#34466f',blue='#65a8dc',dark='#343233',yellow='#efcb50';
  const root=new THREE.Group();root.name='driver-character';
  const torso=batch(add=>{
    const box=(p:[number,number,number],s:[number,number,number],c:string)=>add(new THREE.BoxGeometry(...s),c,p);
    const ball=(p:[number,number,number],r:number,c:string,s:[number,number,number]=[1,1,1])=>add(new THREE.IcosahedronGeometry(r,1),c,p,s);
    box([0,.84,0],[.41,.43,.30],blue);box([0,.62,0],[.42,.065,.31],navy);box([0,.62,.164],[.10,.05,.014],'#bac0c0');
    for(const side of [-1,1])ball([side*.075,1.025,.14],.065,blue,[1,.55,.4]);
    ball([0,1.28,.015],.242,skin,[1,1,.95]);ball([0,1.34,-.07],.225,dark,[1,1,.85]);
    for(const side of [-1,1]){
      ball([side*.242,1.27,.01],.05,skin);ball([side*.085,1.32,.222],.057,'#fff8ea',[1,1,.4]);
      ball([side*.085,1.32,.243],.033,'#342f30',[1,1,.45]);ball([side*.075,1.333,.258],.011,'#ffffff');
      ball([side*.13,1.21,.205],.03,'#df8c86',[1,.4,.3]);box([side*.09,1.397,.213],[.085,.025,.025],dark);
    }
    ball([0,1.25,.249],.033,skin);ball([0,1.165,.22],.061,'#8d3d3b',[1,.65,.35]);box([0,1.184,.246],[.074,.022,.012],'#fff7ea');
    ball([0,1.50,-.015],.264,navy,[1,.56,1]);box([0,1.477,.235],[.43,.035,.25],navy);box([0,1.46,.35],[.43,.02,.027],yellow);
    box([0,1.54,.235],[.15,.063,.014],'#fff8e8');
    for(const x of [-.05,.05]){box([x,1.545,.245],[.043,.025,.009],navy);ball([x,1.505,.243],.014,'#fff8e8');}
    add(new THREE.CylinderGeometry(.047,.047,.012,12),'#87b14d',[-.125,.91,.157],[1,1,1],[Math.PI/2,0,0]);
    ball([-.138,.919,.168],.017,'#c84d4d');ball([-.112,.919,.168],.017,'#c84d4d');
    box([0,.77,.176],[.105,.085,.022],navy);box([0,.774,.190],[.085,.060,.006],'#fff8e8');box([0,.78,.195],[.05,.024,.008],navy);
    for(const side of [-1,1])add(new THREE.CylinderGeometry(.009,.009,.23,5),navy,[side*.035,.91,.17],[1,1,1],[0,0,side*.3]);
  });
  root.add(torso);
  const legs:THREE.Group[]=[],knees:THREE.Group[]=[],arms:THREE.Group[]=[],elbows:THREE.Group[]=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.125,.60,0);root.add(leg);legs.push(leg);
    leg.add(batch(add=>{add(new THREE.BoxGeometry(.18,.27,.21),navy,[0,-.13,0]);add(new THREE.BoxGeometry(.035,.11,.15),navy,[side*.10,-.12,.01]);}));
    const knee=new THREE.Group();knee.position.y=-.27;leg.add(knee);knees.push(knee);
    knee.add(batch(add=>{add(new THREE.BoxGeometry(.165,.26,.19),navy,[0,-.13,0]);add(new THREE.BoxGeometry(.19,.075,.29),navy,[0,-.235,.045]);add(new THREE.BoxGeometry(.20,.035,.30),'#eef0eb',[0,-.28,.045]);}));
    const arm=new THREE.Group();arm.position.set(side*.255,.99,0);root.add(arm);arms.push(arm);
    arm.add(batch(add=>{add(new THREE.CylinderGeometry(.075,.067,.19,8),blue,[0,-.08,0]);}));
    arm.name=side===1?'driver-arm-right':'driver-arm-left';
    const elbow=new THREE.Group();elbow.name=side===1?'driver-elbow-right':'driver-elbow-left';elbow.position.y=-.18;arm.add(elbow);elbows.push(elbow);
    elbow.add(batch(add=>{add(new THREE.CylinderGeometry(.055,.05,.19,8),skin,[0,-.085,0]);add(new THREE.IcosahedronGeometry(.06,1),skin,[0,-.195,.008],[.8,1,.65]);}));
  }
  return {root,torso,legs,knees,arms,elbows};
}
export type DriverModel=ReturnType<typeof createDriverModel>;
export function poseDriver(model:DriverModel,pose:DriverPose,clock:number) {
  const gait=Math.sin(clock*10)*.55*pose.walking;
  model.torso.position.y=-.26*pose.seated;
  for(let i=0;i<2;i++){
    const side=i===0?-1:1;
    model.legs[i].position.y=.60-.26*pose.seated;
    model.legs[i].rotation.x=-pose.seated*Math.PI/2+gait*side;
    model.knees[i].rotation.x=pose.seated*Math.PI/2+Math.max(0,-gait*side)*.4;
    model.arms[i].position.y=.99-.26*pose.seated;
    const reach=pose.operate*(i===1?1:.55)+pose.seated*.65;
    model.arms[i].rotation.x=-.8*reach-gait*side*.5;
    model.elbows[i].rotation.x=-.45*reach-.15;
    model.arms[i].rotation.z=-side*.10;
  }
  if(pose.operate){model.elbows[1].rotation.x+=Math.sin(clock*9)*.09;}
}
