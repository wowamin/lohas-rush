import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Project-authored 3D approximations of the supplied IP character sheets, not photo billboards.
export function createPassengerModel(role: 'grandma' | 'grandpa') {
  const root = new THREE.Group(); root.name = role;
  const batches = new Map<string, THREE.BufferGeometry[]>();
  const add = (geometry: THREE.BufferGeometry, color: string, p: [number,number,number], scale: [number,number,number] = [1,1,1], rotation: [number,number,number] = [0,0,0]) => {
    const object = new THREE.Object3D(); object.position.set(...p); object.scale.set(...scale); object.rotation.set(...rotation); object.updateMatrix();
    const shape = geometry.index ? geometry.toNonIndexed() : geometry.clone(); geometry.dispose();
    shape.deleteAttribute('uv'); shape.applyMatrix4(object.matrix);
    const items = batches.get(color) ?? []; items.push(shape); batches.set(color, items);
  };
  const box = (p: [number,number,number], size: [number,number,number], color: string) => add(new THREE.BoxGeometry(...size),color,p);
  const ball = (p: [number,number,number], radius: number, color: string, scale: [number,number,number] = [1,1,1]) => add(new THREE.IcosahedronGeometry(radius,1),color,p,scale);
  const tube = (a: [number,number,number], b: [number,number,number], radius: number, color: string) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
    const base = new THREE.CylinderGeometry(radius,radius,direction.length(),6), shape = base.toNonIndexed(); base.dispose(); shape.deleteAttribute('uv');
    shape.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize())); shape.translate(...from.add(to).multiplyScalar(.5).toArray());
    const items = batches.get(color) ?? []; items.push(shape); batches.set(color,items);
  };
  const ring = (p: [number,number,number], radius: number, width: number, color: string, wheel = false) => add(new THREE.TorusGeometry(radius,width,5,16),color,p,[1,1,1],wheel ? [0,Math.PI/2,0] : [0,0,0]);
  const skin = '#edb88e', chair = '#397da2', frame = '#8ab6c5', gold = '#eac74e', dark = '#38474e';
  box([0,.49,0],[.44,.07,.39],chair); box([0,.69,-.18],[.44,.42,.06],chair);
  box([0,.12,.31],[.43,.035,.19],chair);
  for (const side of [-1,1]) {
    ring([side*.295,.30,-.04],.278,.025,dark,true); ring([side*.315,.30,-.04],.25,.018,gold,true);
    ball([side*.33,.30,-.04],.045,frame);
    for (let i = 0; i < 10; i++) { const a = i/10*Math.PI*2; tube([side*.32,.30,-.04],[side*.32,.30+Math.sin(a)*.24,-.04+Math.cos(a)*.24],.007,frame); }
    ring([side*.21,.075,.32],.052,.015,dark,true);
    tube([side*.22,.15,.32],[side*.22,.69,-.16],.018,frame);
    tube([side*.22,.49,.12],[side*.22,.84,-.2],.018,frame);
    tube([side*.22,.84,-.2],[side*.22,.84,-.3],.025,dark);
    box([side*.23,.67,.02],[.06,.035,.32],chair);
    ball([side*.10,.16,.27],.085,'#ba394d',[.8,.65,1.25]);
  }
  box([0,.73,0],[.35,.32,.26],role === 'grandma' ? '#c52b70' : '#a52c52');
  box([0,.66,.145],[.35,.035,.025],dark); // simplified lap restraint while seated
  ball([0,1.105,.02],.226,skin,[1,1,.95]);
  for (const side of [-1,1]) {
    ball([side*.235,1.09,.02],.052,skin);
    ball([side*.091,1.15,.213],.065,'#fff7e9',[1,1,.42]);
    ball([side*.091,1.15,.237],.038,'#263b42',[1,1,.45]);
    ball([side*.082,1.165,.253],.012,'#ffffff');
    ball([side*.145,1.045,.197],.034,'#df8d8f',[1,.5,.25]);
  }
  ball([0,1.075,.241],.032,skin); ball([0,1.005,.224],.045,'#9e394d',[1,.65,.22]);
  tube([-.18,.81,.04],[-.26,.73,.20],.041,role === 'grandma' ? '#c52b70' : '#b64034');
  ball([-.26,.73,.21],.05,skin);
  tube([.18,.81,.04],[.30,.91,.08],.041,role === 'grandma' ? '#c52b70' : '#b64034');
  ball([.32,.97,.08],.055,skin,[.8,1.2,.5]);
  for (let i = 0; i < 4; i++) tube([.29+i*.018,1.0,.08],[.285+i*.025,1.065+(i%2)*.012,.08],.009,skin);
  if (role === 'grandma') {
    ball([0,1.20,-.07],.245,'#ec91b5',[1.12,1,1]);
    for (const z of [-.17,-.04,.08]) for (let i = 0; i < 9; i++) {
      const a = i/8*Math.PI;
      ball([Math.cos(a)*.245,1.12+Math.sin(a)*.25,z],.079,i%2 ? '#f4a9c6' : '#e77fa8');
    }
    for (const side of [-1,1]) ring([side*.095,1.15,.256],.075,.012,'#ac294d');
    box([0,1.15,.256],[.045,.018,.018],'#ac294d');
    for (let i = 0; i < 7; i++) { const a = i/6*Math.PI; ball([Math.cos(a)*.14,.88-Math.sin(a)*.045,.15],.018,'#fff5df'); }
    add(new THREE.CylinderGeometry(.17,.23,.28,10),'#d84669',[0,.44,.12]);
    box([-.10,.25,.2],[.09,.18,.10],skin); box([.10,.25,.2],[.09,.18,.10],skin);
    add(new THREE.CylinderGeometry(.052,.043,.12,10),'#c9915d',[-.26,.76,.26]);
    tube([-.26,.82,.26],[-.255,.92,.26],.007,'#4f9774');
    for (let i=0;i<5;i++) ball([-.29+(i%3)*.022,.72+(i%2)*.022,.302],.009,'#604939');
  } else {
    for (let i = 0; i < 11; i++) { const a = i/10*Math.PI; ball([Math.cos(a)*.215,1.15+Math.sin(a)*.17,-.035],.06,'#cbd7cd'); }
    ball([0,1.29,-.025],.235,'#8bc777',[1.07,.6,1]);
    ball([0,1.405,-.035],.075,'#8bc777',[.5,.9,.7]);
    for (const side of [-1,1]) ball([side*.035,1.045,.252],.041,'#cbd7cd',[1,.55,.45]);
    for (const side of [-1,1]) {
      box([side*.09,.36,.13],[.15,.23,.17],'#4e8fae');
      ball([side*.085,.88,.13],.055,'#eac64b',[1,.7,.35]);
    }
  }
  for (const [color, shapes] of batches) {
    const geometry = mergeGeometries(shapes); shapes.forEach(shape => shape.dispose());
    const mesh = new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({ color, roughness:.78 }));
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
  }
  root.userData.role = role; return root;
}
