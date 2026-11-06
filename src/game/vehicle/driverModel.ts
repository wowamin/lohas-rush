import * as THREE from 'three';
import { CharacterGeometry, addCharacterFace, roundedCharacterBox, tailoredCharacterGeometry, type CharacterAdd } from '../characters/characterGeometry.ts';
import type { DriverPose } from './driverAssistance.ts';
import { DRIVER_CHAIR_OFFSET } from './transferPath.ts';

function batch(build:(add:CharacterAdd)=>void) {
  const geometry=new CharacterGeometry('#edb58b',['#343233','#695044','#48403b'],['#bac0c0','#b7c4ca']);
  build(geometry.add);return geometry.finish();
}

// Geometry approximation of the supplied blue-uniform driver sheet; no image planes or tiny lettering.
export function createDriverModel() {
  const skin='#edb58b',navy='#34466f',blue='#65a8dc',dark='#343233',yellow='#efcb50';
  const root=new THREE.Group();root.name='driver-character';
  const torso=batch(add=>{
    const box=(p:[number,number,number],s:[number,number,number],c:string)=>add(roundedCharacterBox(s),c,p);
    const ball=(p:[number,number,number],r:number,c:string,s:[number,number,number]=[1,1,1])=>add(new THREE.SphereGeometry(r,20,14),c,p,s);
    add(tailoredCharacterGeometry([[.625,.195,.142],[.68,.194,.146],[.76,.186,.14],[.87,.20,.147],
      [.96,.214,.15],[1.013,.217,.132],[1.045,.16,.10],[1.055,.075,.068]]),blue);
    box([0,.62,0],[.42,.065,.31],navy);box([0,.62,.164],[.10,.05,.014],'#bac0c0');
    for(const side of [-1,1])ball([side*.075,1.025,.14],.065,blue,[1,.55,.4]);
    addCharacterFace(add,[0,1.28,.015],[.242,.242,.230],skin);
    ball([0,1.34,-.07],.225,dark,[1,1,.85]);
    ball([0,1.50,-.015],.264,navy,[1,.56,1]);box([0,1.477,.235],[.43,.035,.25],navy);box([0,1.46,.35],[.43,.02,.027],yellow);
    box([0,1.54,.235],[.15,.063,.014],'#fff8e8');
    for(const x of [-.05,.05]){box([x,1.545,.245],[.043,.025,.009],navy);ball([x,1.505,.243],.014,'#fff8e8');}
    add(new THREE.CylinderGeometry(.047,.047,.012,12),'#87b14d',[-.125,.91,.157],[1,1,1],[Math.PI/2,0,0]);
    ball([-.138,.919,.168],.017,'#c84d4d');ball([-.112,.919,.168],.017,'#c84d4d');
    box([0,.77,.176],[.105,.085,.022],navy);box([0,.774,.190],[.085,.060,.006],'#fff8e8');box([0,.78,.195],[.05,.024,.008],navy);
    for(const side of [-1,1])add(new THREE.CylinderGeometry(.009,.009,.23,5),navy,[side*.035,.91,.17],[1,1,1],[0,0,side*.3]);
    // Collar seams, placket, buttons and an inset breast pocket.
    box([0,.9,.157],[.017,.28,.012],'#4c8fbd');
    for(const y of [.82,.9,.98])ball([0,y,.171],.008,'#fff8ee',[1,1,.45]);
    box([.125,.887,.159],[.105,.115,.013],'#5798c7');
    box([.125,.941,.169],[.109,.008,.01],'#a2cce8');
    for(const side of [-1,1])box([side*.11,1.02,.167],[.10,.012,.012],'#a2cce8');
    box([0,.84,-.15],[.005,.32,.006],'#5798c7');
    box([0,1.0,-.141],[.28,.006,.006],'#5798c7');
    // Subtle curved cap piping, with a smooth visor instead of a sharp slab.
    const trim=new THREE.CatmullRomCurve3([new THREE.Vector3(-.195,1.48,.25),new THREE.Vector3(0,1.475,.355),new THREE.Vector3(.195,1.48,.25)]);
    add(new THREE.TubeGeometry(trim,24,.004,6,false),yellow,[0,0,0]);
  });
  root.add(torso);
  const legs:THREE.Group[]=[],knees:THREE.Group[]=[],ankles:THREE.Group[]=[],arms:THREE.Group[]=[],elbows:THREE.Group[]=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.125,.60,0);root.add(leg);legs.push(leg);
    leg.add(batch(add=>{add(tailoredCharacterGeometry([[-.265,.078,.09],[-.22,.082,.097],[-.10,.089,.104],[0,.087,.103]]),navy);
      add(roundedCharacterBox([.035,.11,.15]),navy,[side*.10,-.12,.01]);
    }));
    const knee=new THREE.Group();knee.position.y=-.27;leg.add(knee);knees.push(knee);
    knee.add(batch(add=>{add(tailoredCharacterGeometry([[-.255,.073,.085],[-.21,.076,.089],[-.10,.082,.095],[0,.080,.093]]),navy);
      add(new THREE.SphereGeometry(.08,20,14),navy,[0,0,0],[1,1.05,1.16]);
    }));
    const ankle=new THREE.Group();ankle.position.y=-.26;knee.add(ankle);ankles.push(ankle);
    ankle.add(batch(add=>{
      add(roundedCharacterBox([.19,.075,.29],.45),navy,[0,.025,.045]);add(roundedCharacterBox([.20,.035,.30],.45),'#eef0eb',[0,-.02,.045]);
      for(const z of [.05,.085,.12])add(roundedCharacterBox([.10,.008,.012]),'#b7c4ca',[0,.053,z]);
    }));
    const arm=new THREE.Group();arm.position.set(side*.255,.99,0);root.add(arm);arms.push(arm);
    arm.add(batch(add=>{add(new THREE.CylinderGeometry(.075,.067,.19,20),blue,[0,-.08,0]);
      add(new THREE.SphereGeometry(.073,20,14),blue,[0,.008,0],[1,.8,1]);
      add(new THREE.CylinderGeometry(.068,.068,.014,20),'#a2cce8',[0,-.163,0]);
    }));
    arm.name=side===1?'driver-arm-right':'driver-arm-left';
    const elbow=new THREE.Group();elbow.name=side===1?'driver-elbow-right':'driver-elbow-left';elbow.position.y=-.18;arm.add(elbow);elbows.push(elbow);
    elbow.add(batch(add=>{add(new THREE.CylinderGeometry(.055,.05,.19,20),skin,[0,-.085,0]);add(new THREE.SphereGeometry(.06,24,18),skin,[0,-.195,.008],[.8,1,.65]);
      add(new THREE.SphereGeometry(.053,20,14),skin,[0,0,0]);
      for(let finger=0;finger<3;finger++)add(new THREE.SphereGeometry(.012,12,8),skin,[-.025+finger*.023,-.226,.028],[.7,1.8,.75]);
    }));
  }
  return {root,torso,legs,knees,ankles,arms,elbows};
}
export type DriverModel=ReturnType<typeof createDriverModel>;
export function poseDriver(model:DriverModel,pose:DriverPose,clock:number) {
  const gait=Math.sin(clock*10)*.55*pose.walking;
  model.torso.position.y=-.26*pose.seated-pose.crouch;
  for(let i=0;i<2;i++){
    const side=i===0?-1:1;
    model.legs[i].position.y=.60-.26*pose.seated-pose.crouch*.42;
    model.legs[i].rotation.x=-pose.seated*Math.PI/2-pose.crouch/.16*.35+gait*side*.55;
    model.knees[i].rotation.x=pose.seated*Math.PI/2+pose.crouch/.16*.70+Math.max(0,-gait*side)*.4;
    model.ankles[i].rotation.x=-(model.legs[i].rotation.x+model.knees[i].rotation.x);
    model.arms[i].position.set(side*(.255-.057*pose.grip),.99-.26*pose.seated-pose.crouch,0);
    const reach=pose.operate*(i===1?1:.55)+pose.seated*.65;
    model.arms[i].rotation.x=-.8*reach-gait*side*.5;
    model.elbows[i].rotation.x=-.45*reach-.15;
    model.arms[i].rotation.z=-side*.10*(1-pose.grip);
    if(pose.grip){
      // Two-link reach to the scaled chair handles at y=.756, z=.27.
      const y=.756-model.arms[i].position.y,z=DRIVER_CHAIR_OFFSET-.27,upper=.18,forearm=.195;
      const bend=Math.acos(Math.max(-1,Math.min(1,(y*y+z*z-upper*upper-forearm*forearm)/(2*upper*forearm))));
      const shoulder=Math.atan2(z,-y)-Math.atan2(forearm*Math.sin(bend),upper+forearm*Math.cos(bend));
      model.arms[i].rotation.x+=( -shoulder-model.arms[i].rotation.x)*pose.grip;
      model.elbows[i].rotation.x+=( -bend-model.elbows[i].rotation.x)*pose.grip;
    }
  }
  if(pose.operate){model.elbows[1].rotation.x+=Math.sin(clock*9)*.09;}
}
