import * as THREE from 'three';
import { CharacterGeometry, addCharacterFace, tailoredCharacterGeometry } from '../characters/characterGeometry.ts';

// Project-authored 3D approximations of the supplied IP character sheets, not photo billboards.
export function createPassengerModel(role: 'grandma' | 'grandpa') {
  const root = new THREE.Group(); root.name = role;
  const builder = new CharacterGeometry('#edb88e',['#ec91b5','#f4a9c6','#e77fa8','#cbd7cd','#695044','#f8bdd4'],['#8ab6c5','#eac74e','#b6c7cc']);
  const {add,box,ball,tube,curve} = builder;
  const ring = (p: [number,number,number], radius: number, width: number, color: string, wheel = false) => add(new THREE.TorusGeometry(radius,width,8,32),color,p,[1,1,1],wheel ? [0,Math.PI/2,0] : [0,0,0]);
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
  add(tailoredCharacterGeometry([[.57,.157,.117],[.62,.173,.126],[.70,.167,.127],[.78,.18,.13],
    [.845,.172,.121],[.878,.12,.088],[.89,.07,.06]]),role === 'grandma' ? '#c52b70' : '#a52c52');
  box([0,.66,.145],[.35,.035,.025],dark); // simplified lap restraint while seated
  addCharacterFace(add,[0,1.105,.02],[.226,.226,.215],skin,true);
  tube([-.18,.81,.04],[-.26,.73,.20],.041,role === 'grandma' ? '#c52b70' : '#b64034');
  ball([-.26,.73,.21],.05,skin);
  tube([.18,.81,.04],[.30,.91,.08],.041,role === 'grandma' ? '#c52b70' : '#b64034');
  ball([.32,.97,.08],.055,skin,[.8,1.2,.5]);
  for (let i = 0; i < 4; i++) tube([.29+i*.018,1.0,.08],[.285+i*.025,1.065+(i%2)*.012,.08],.009,skin);
  for (let i = 0; i < 4; i++)ball([.285+i*.025,1.065+(i%2)*.012,.08],.009,skin);
  if (role === 'grandma') {
    ball([0,1.20,-.07],.245,'#ec91b5',[1.12,1,1]);
    const scalp = { x: .245 * 1.12, y: .245, z: .245 };
    const hairColors = ['#f4a9c6', '#e77fa8', '#f8bdd4'];
    for (const phi of [.22,.52,.82,1.12,1.42,1.72,2.02,2.32]) {
      const count = Math.max(8, Math.round(18 * Math.sin(phi)));
      for (let i = 0; i < count; i++) {
        const theta = i / count * Math.PI * 2;
        const wrappedTheta = theta > Math.PI ? theta - Math.PI * 2 : theta;
        if (Math.abs(wrappedTheta) < .95 && phi > 1.22) continue;
        const x = scalp.x * Math.sin(phi) * Math.sin(theta);
        const y = 1.20 + scalp.y * Math.cos(phi);
        const z = -.07 + scalp.z * Math.sin(phi) * Math.cos(theta);
        const normal = new THREE.Vector3(x / scalp.x ** 2, (y - 1.20) / scalp.y ** 2, (z + .07) / scalp.z ** 2).normalize();
        const curl = .058 + (i % 3) * .003;
        add(new THREE.SphereGeometry(curl, 12, 8), hairColors[(i + Math.round(phi * 10)) % hairColors.length],
          [x + normal.x * .006, y + normal.y * .006, z + normal.z * .006]);
      }
    }
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * .047;
      const y = 1.27 - Math.abs(i - 3) * .004;
      const z = .02 + .215 * Math.sqrt(1 - (x / .226) ** 2 - ((y - 1.105) / .226) ** 2) + .018;
      add(new THREE.SphereGeometry(.052, 14, 10), hairColors[i % hairColors.length], [x, y, z]);
    }
    for(const side of [-1,1]) ring([side*.095,1.15,.256],.075,.012,'#ac294d');
    box([0,1.15,.256],[.045,.018,.018],'#ac294d');
    for(const side of [-1,1])tube([side*.164,1.15,.252],[side*.235,1.15,.09],.006,'#ac294d');
    for (let i = 0; i < 7; i++) { const a = i/6*Math.PI; ball([Math.cos(a)*.14,.88-Math.sin(a)*.045,.15],.018,'#fff5df'); }
    add(new THREE.CylinderGeometry(.17,.23,.28,10),'#d84669',[0,.44,.12]);
    box([-.10,.25,.2],[.09,.18,.10],skin); box([.10,.25,.2],[.09,.18,.10],skin);
    add(new THREE.CylinderGeometry(.052,.043,.12,10),'#c9915d',[-.26,.76,.26]);
    tube([-.26,.82,.26],[-.255,.92,.26],.007,'#4f9774');
    for (let i=0;i<5;i++) ball([-.29+(i%3)*.022,.72+(i%2)*.022,.302],.009,'#604939');
    for(const side of [-1,1]){
      ball([side*.218,1.03,.08],.015,'#fff9ef',[1,1.2,1]);
      curve([[side*.115,.83,.136],[side*.12,.76,.139],[side*.13,.69,.138]],.0025,'#f18ab2');
    }
    for(const y of [.72,.77,.82])ball([0,y,.139],.007,'#fff9ef',[1,1,.5]);
    ring([-.26,.812,.26],.05,.004,'#f0d3af');
  } else {
    for (let i = 0; i < 11; i++) { const a = i/10*Math.PI; ball([Math.cos(a)*.215,1.15+Math.sin(a)*.17,-.035],.06,'#cbd7cd'); }
    ball([0,1.29,-.025],.235,'#8bc777',[1.07,.6,1]);
    ball([0,1.405,-.035],.075,'#8bc777',[.5,.9,.7]);
    curve([[-.18,1.286,.105],[-.09,1.31,.187],[0,1.315,.207],[.09,1.31,.187],[.18,1.286,.105]],.003,'#b7dfa4');
    for(let i=0;i<5;i++)curve([[-.16+i*.08,1.35,-.15],[-.13+i*.065,1.405,-.04],[-.12+i*.06,1.35,.12]],.0018,'#72aa63');
    for (const side of [-1,1]) ball([side*.035,1.045,.252],.041,'#cbd7cd',[1,.55,.45]);
    for (const side of [-1,1]) {
      box([side*.09,.36,.13],[.15,.23,.17],'#4e8fae');
      ball([side*.085,.88,.13],.055,'#eac64b',[1,.7,.35]);
      curve([[side*.085,.885,.15],[side*.13,.85,.149],[side*.15,.78,.145]],.0025,'#d97985');
    }
    box([0,.815,.144],[.012,.15,.009],'#7e2445');
    for(const y of [.76,.81,.86])ball([0,y,.153],.007,'#eac74e',[1,1,.4]);
  }
  // Upholstery piping, metal axle hubs, restraint buckle and shoe stitching.
  for(const side of [-1,1]){
    curve([[side*.19,.86,-.135],[side*.19,.69,-.135],[side*.19,.53,-.135]],.0035,'#84aec5');
    ring([side*.337,.30,-.04],.037,.006,'#b6c7cc',true);
    for(const z of [.25,.28,.31])box([side*.10,.21,z],[.064,.006,.01],'#efaaa7');
    box([side*.218,.661,.105],[.037,.006,.09],'#84aec5');
  }
  box([0,.66,.165],[.055,.032,.015],'#b6c7cc');
  const complete=builder.finish();root.add(...complete.children);
  root.userData.role = role; return root;
}
