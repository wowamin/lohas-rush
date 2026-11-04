import * as THREE from 'three';
import {CharacterGeometry,addCharacterFace,tailoredCharacterGeometry,type CharacterAdd} from '../characters/characterGeometry.ts';

type Point=[number,number,number];
// Original geometry approximation of the supplied sheet, with both hands free
// to hold the chair; small badge lettering is deliberately omitted.
export function createCaregiverModel(){
  const root=new THREE.Group();root.name='caregiver-character';
  const skin='#efb68e',hair='#765041',blue='#78b9e8',navy='#40425e',pink='#ec8fb6';
  function batch(build:(box:(p:Point,s:Point,c:string)=>void,ball:(p:Point,r:number,c:string,s?:Point)=>void,tube:(a:Point,b:Point,r:number,c:string)=>void,add:CharacterAdd)=>void){
    const geometry=new CharacterGeometry(skin,[hair,'#94705a','#695044']);
    build(geometry.box,geometry.ball,geometry.tube,geometry.add);return geometry.finish();
  }
  const body=batch((box,ball,tube,add)=>{
    add(tailoredCharacterGeometry([[.625,.19,.137],[.68,.19,.142],[.77,.183,.137],[.88,.195,.144],
      [.97,.208,.145],[1.015,.207,.126],[1.045,.15,.10],[1.055,.075,.068]]),blue);
    box([0,.60,0],[.42,.08,.30],navy);
    for(const side of [-1,1])ball([side*.073,1.025,.135],.065,blue,[1,.6,.4]);
    addCharacterFace(add,[0,1.27,.015],[.238,.238,.224],skin);
    ball([0,1.34,-.065],.24,hair,[1,1,.88]);
    ball([-.11,1.43,.09],.155,hair,[1.15,.55,.8]);ball([.12,1.40,.10],.11,hair,[1,.8,.7]);
    ball([.03,1.48,-.22],.13,pink,[1,1,.8]);ball([.03,1.51,-.27],.145,hair);
    // Curved comb lines follow the swept fringe and bun surface.
    for(let i=0;i<8;i++){
      const offset=i*.018;
      const path=new THREE.CatmullRomCurve3([new THREE.Vector3(.15-offset*.15,1.47,.04),
        new THREE.Vector3(-.025-offset*.35,1.485-offset*.12,.145),new THREE.Vector3(-.20,1.40-offset*.65,.115)]);
      add(new THREE.TubeGeometry(path,18,.0023,6,false),i%2?hair:'#94705a',[0,0,0]);
    }
    for(let i=0;i<5;i++)add(new THREE.TorusGeometry(.10-i*.012,.002,6,24),'#94705a',[.03,1.51,-.375+i*.007],[1,1,1]);
    for(let i=0;i<11;i++){
      const x=-.17+i*.034;
      const points=Array.from({length:9},(_,j)=>{
        const y=1.46-j*.025,px=x*(1-j*.025);
        const z=-.065-.2112*Math.sqrt(Math.max(.04,1-(px/.24)**2-((y-1.34)/.24)**2));
        return new THREE.Vector3(px,y,z-.002);
      });
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.0018,6,false),'#94705a');
    }
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
    // Collar, stitched apron pockets, badge clip and pen tips.
    for(const side of [-1,1]){
      box([side*.085,1.014,.154],[.08,.012,.014],'#b4d8ee');
      box([side*.12,.514,.246],[.16,.006,.006],'#9c9bb3');
      box([side*.197,.58,.246],[.006,.13,.006],'#9c9bb3');
    }
    box([0,.824,.195],[.028,.025,.012],'#b7c4ca');
    for(let i=0;i<3;i++)ball([-.17+i*.04,.822,.23],.009,['#e7bb45','#529cae','#c87599'][i]);
  });root.add(body);
  const arms=batch((box,ball,tube)=>{
    for(const side of [-1,1]){
      ball([side*.24,.975,.02],.071,blue,[1,1,1]);
      tube([side*.24,.99,.02],[side*.23,.875,.13],.072,blue);
      tube([side*.23,.875,.13],[side*.22,.79,.23],.047,skin);
      tube([side*.22,.79,.23],[side*.198,.756,.495],.046,skin);
      ball([side*.198,.756,.495],.05,skin,[1,.8,1]);
      ball([side*.22,.79,.23],.047,skin);
      for(let i=0;i<3;i++)ball([side*.198+(i-1)*.018,.733,.506],.012,skin,[.75,1,1.25]);
      ball([side*.229,.771,.491],.018,skin,[.7,1,1.1]);
    }
    // box is supplied by the shared local builder but not needed for arms.
    void box;
  });
  for(const child of arms.children)(child as THREE.Mesh).geometry.translate(0,-.99,0);
  arms.position.y=.99;arms.name='caregiver-pushing-arms';root.add(arms);
  const legs:THREE.Group[]=[],knees:THREE.Group[]=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.12,.59,0);leg.name=side===1?'caregiver-leg-right':'caregiver-leg-left';
    leg.add(batch((_box,_ball,_tube,add)=>{add(tailoredCharacterGeometry([[-.25,.077,.089],[-.19,.081,.095],[-.08,.085,.10],[0,.083,.099]]),navy);}));
    const knee=new THREE.Group();knee.position.y=-.25;leg.add(knee);knees.push(knee);
    knee.add(batch((box,ball,_tube,add)=>{add(tailoredCharacterGeometry([[-.25,.073,.085],[-.18,.078,.09],[-.08,.083,.098],[0,.078,.091]]),navy);
      ball([0,0,0],.078,navy,[1,1.05,1.16]);
      box([0,-.265,.045],[.19,.09,.29],pink);box([0,-.305,.045],[.20,.03,.30],'#fff7ee');
      for(const z of [.05,.085,.12])box([0,-.218,z],[.10,.008,.012],'#fff7ee');
      box([side*.072,-.125,.085],[.004,.21,.004],'#62617a');
    }));
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
