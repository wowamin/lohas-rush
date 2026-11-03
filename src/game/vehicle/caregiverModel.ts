import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

type Point=[number,number,number];
// Original geometry approximation of the supplied sheet, with both hands free
// to hold the chair; small badge lettering is deliberately omitted.
export function createCaregiverModel(){
  const root=new THREE.Group();root.name='caregiver-character';
  const skin='#efb68e',hair='#765041',blue='#78b9e8',navy='#40425e',pink='#ec8fb6';
  function batch(build:(box:(p:Point,s:Point,c:string)=>void,ball:(p:Point,r:number,c:string,s?:Point)=>void,tube:(a:Point,b:Point,r:number,c:string)=>void)=>void){
    const colors=new Map<string,THREE.BufferGeometry[]>();
    const add=(source:THREE.BufferGeometry,color:string,p:Point,s:Point=[1,1,1])=>{
      const shape=source.index?source.toNonIndexed():source.clone();source.dispose();shape.deleteAttribute('uv');shape.scale(...s);shape.translate(...p);
      const shapes=colors.get(color)??[];shapes.push(shape);colors.set(color,shapes);
    };
    const box=(p:Point,s:Point,c:string)=>add(new THREE.BoxGeometry(...s),c,p);
    const ball=(p:Point,r:number,c:string,s:Point=[1,1,1])=>add(new THREE.IcosahedronGeometry(r,1),c,p,s);
    const tube=(a:Point,b:Point,r:number,c:string)=>{
      const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),axis=to.clone().sub(from);
      const geometry=new THREE.CylinderGeometry(r,r,axis.length(),8);
      geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize()));
      add(geometry,c,from.add(to).multiplyScalar(.5).toArray() as Point);
    };
    build(box,ball,tube);const group=new THREE.Group();
    for(const[color,shapes]of colors){const geometry=mergeGeometries(shapes);shapes.forEach(shape=>shape.dispose());const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.8}));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
    return group;
  }
  const body=batch((box,ball,tube)=>{
    box([0,.84,0],[.40,.43,.29],blue);box([0,.60,0],[.42,.08,.30],navy);
    for(const side of [-1,1])ball([side*.073,1.025,.135],.065,blue,[1,.6,.4]);
    ball([0,1.27,.015],.238,skin,[1,1,.94]);ball([0,1.34,-.065],.24,hair,[1,1,.88]);
    ball([-.11,1.43,.09],.155,hair,[1.15,.55,.8]);ball([.12,1.40,.10],.11,hair,[1,.8,.7]);
    ball([.03,1.48,-.22],.13,pink,[1,1,.8]);ball([.03,1.51,-.27],.145,hair);
    for(const side of [-1,1]){
      ball([side*.236,1.26,.01],.048,skin);ball([side*.084,1.30,.220],.057,'#fff9ef',[1,1,.4]);
      ball([side*.084,1.30,.243],.033,'#453830',[1,1,.4]);ball([side*.075,1.312,.258],.011,'#ffffff');
      ball([side*.13,1.20,.21],.031,'#e78f96',[1,.45,.3]);box([side*.087,1.377,.218],[.075,.022,.022],hair);
    }
    ball([0,1.235,.247],.029,skin);ball([0,1.155,.219],.057,'#a14048',[1,.7,.35]);box([0,1.175,.24],[.07,.019,.01],'#fff8ed');
    // Pink lanyard, simple ID and round green chest badge, without invented type.
    for(const side of [-1,1])tube([side*.075,1.01,.16],[0,.80,.17],.012,pink);
    box([0,.765,.18],[.105,.115,.022],'#fff8ef');ball([0,.79,.197],.020,'#7099c2');box([0,.748,.197],[.055,.026,.009],'#7099c2');
    ball([-.125,.92,.157],.049,'#8fbf60',[1,1,.23]);ball([-.125,.92,.171],.025,'#fff8e8',[1,1,.2]);ball([-.125,.92,.18],.014,'#d95b6b');
    // Apron pockets, pink edging, tools and back waist tie.
    box([0,.59,.17],[.49,.29,.07],pink);box([0,.61,.21],[.43,.24,.025],navy);
    for(const side of [-1,1]){box([side*.12,.58,.23],[.18,.15,.025],navy);box([side*.12,.66,.248],[.19,.025,.02],pink);}
    for(let i=0;i<3;i++)box([-.17+i*.04,.75,.23],[.023,.14,.025],['#f1d46a','#83c5d4',pink][i]);
    box([.17,.73,.23],[.065,.10,.055],'#fff6ed');box([.17,.79,.23],[.075,.016,.06],pink);
    box([0,.65,-.17],[.43,.045,.025],pink);ball([-.055,.65,-.195],.06,pink,[1,.5,.3]);ball([.055,.65,-.195],.06,pink,[1,.5,.3]);
  });root.add(body);
  const arms=batch((box,ball,tube)=>{
    for(const side of [-1,1]){
      tube([side*.24,.99,.02],[side*.23,.875,.13],.072,blue);
      tube([side*.23,.875,.13],[side*.22,.79,.23],.047,skin);
      tube([side*.22,.79,.23],[side*.198,.756,.495],.046,skin);
      ball([side*.198,.756,.495],.05,skin,[1,.8,1]);
    }
    // box is supplied by the shared local builder but not needed for arms.
    void box;
  });
  for(const child of arms.children)(child as THREE.Mesh).geometry.translate(0,-.99,0);
  arms.position.y=.99;arms.name='caregiver-pushing-arms';root.add(arms);
  const legs:THREE.Group[]=[],knees:THREE.Group[]=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.12,.59,0);leg.name=side===1?'caregiver-leg-right':'caregiver-leg-left';
    leg.add(batch((box)=>{box([0,-.125,0],[.17,.25,.20],navy);}));
    const knee=new THREE.Group();knee.position.y=-.25;leg.add(knee);knees.push(knee);
    knee.add(batch((box)=>{box([0,-.125,0],[.17,.25,.20],navy);box([0,-.265,.045],[.19,.09,.29],pink);box([0,-.305,.045],[.20,.03,.30],'#fff7ee');}));
    legs.push(leg);root.add(leg);
  }
  return{root,body,arms,legs,knees};
}
export type CaregiverModel=ReturnType<typeof createCaregiverModel>;
export function poseCaregiver(model:CaregiverModel,stride:number,motion:number,grip:number,seated=0){
  model.body.position.y=-.26*seated;model.arms.position.y=.99-.26*seated;
  for(let i=0;i<2;i++){
    model.legs[i].position.y=.59-.26*seated;
    model.legs[i].rotation.x=-Math.PI/2*seated+Math.sin(stride)*.38*motion*(i===0?1:-1);
    model.knees[i].rotation.x=Math.PI/2*seated;
  }
  model.arms.rotation.x=(1-grip)*.85; // Both hands stay fixed on the grips while pushing.
}
