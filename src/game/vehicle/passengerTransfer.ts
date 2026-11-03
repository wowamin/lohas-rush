import { CITY_LIMIT, obstacles, type Obstacle } from '../../data/city.ts';
import type { VehicleState } from './drivingPhysics.ts';
import { BOARDING_RADIUS } from './wheelchairController.ts';

export const transferDurations = {
  driverExit:1.5, driverWalk:1.8, driverReturn:1.8, driverEnter:1.5,
  opening: 1, deploying: 1.2, rollingOut: 1.6, lowering: 1.4, exiting: 1.4,
  aligning: .8, boarding: 1.4, raising: 1.4, rollingIn: 1.6, folding: 1.2, closing: 1,
} as const;
export type TransferPhase = 'stowed' | 'outside' | keyof typeof transferDurations;
export const transferLabels: Record<TransferPhase, string> = {
  driverExit:'司機大哥下車準備',driverWalk:'司機前往車尾控制台',driverReturn:'司機返回駕駛座',driverEnter:'司機上車並關妥車門',
  stowed: '兩位乘客在車內', opening: '後車門開啟中', deploying: '升降平台展開中',
  rollingOut: '奶奶移至平台', lowering: '平台下降中', exiting: '奶奶離開平台',
  outside: '操控奶奶輪椅・爺爺留在車內', aligning: '輪椅對準升降平台', boarding: '奶奶返回平台', raising: '平台上升中',
  rollingIn: '奶奶返回車廂', folding: '收起升降平台', closing: '後車門關閉中',
};
const next: Partial<Record<TransferPhase, TransferPhase>> = {
  driverExit:'driverWalk',driverWalk:'opening',driverReturn:'driverEnter',driverEnter:'stowed',
  opening:'deploying', deploying:'rollingOut', rollingOut:'lowering', lowering:'exiting', exiting:'outside',
  aligning:'boarding', boarding:'raising', raising:'rollingIn', rollingIn:'folding', folding:'closing', closing:'driverReturn',
};
const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x*x*(3-2*x); };
const lerp = (a: number, b: number, t: number) => a + (b-a)*t;
export type TransferPose = { hatch: number; fold: number; deckY: number; grandmaX: number; grandmaY: number; grandmaZ: number; grandmaYaw: number; grandmaInside: boolean };

export function transferPose(phase: TransferPhase, progress = 0): TransferPose {
  const t = ease(progress);
  const pose: TransferPose = { hatch: 1, fold: 0, deckY: .75, grandmaX: 0, grandmaY: .75, grandmaZ: 2.75, grandmaYaw: Math.PI, grandmaInside: false };
  const seated = () => { pose.grandmaX = -.43; pose.grandmaY = .75; pose.grandmaZ = .42; pose.grandmaInside = true; };
  if (phase === 'stowed' || phase === 'driverExit' || phase === 'driverWalk' || phase === 'driverReturn' || phase === 'driverEnter' || phase === 'opening' || phase === 'deploying' || phase === 'folding' || phase === 'closing') {
    seated();
    const closed=['stowed','driverExit','driverWalk','driverReturn','driverEnter'].includes(phase);
    pose.hatch = closed ? 0 : phase === 'opening' ? t : phase === 'closing' ? 1-t : 1;
    pose.fold = phase === 'deploying' ? 1-t : phase === 'folding' ? t : 1;
  } else if (phase === 'rollingOut' || phase === 'rollingIn') {
    const u = phase === 'rollingOut' ? progress : 1-progress;
    pose.grandmaX = lerp(-.43, 0, ease(u/.3));
    pose.grandmaZ = lerp(.42, 2.75, ease((u-.3)/.7));
    pose.grandmaInside = pose.grandmaZ < 2;
  } else if (phase === 'lowering' || phase === 'raising') {
    pose.deckY = lerp(.75, .14, phase === 'lowering' ? t : 1-t); pose.grandmaY = pose.deckY;
  } else {
    pose.deckY = .14; pose.grandmaY = .14;
    pose.grandmaZ = phase === 'outside' || phase === 'aligning' ? 4.5 : lerp(2.75, 4.5, phase === 'exiting' ? t : 1-t);
  }
  return pose;
}

// SAT tests reserve the rear lift area and the driver's walking/door corridor.
// Both must clear world obstacles before the locked service sequence begins.
export function transferAreaClear(vehicle: Pick<VehicleState,'x'|'z'|'angle'>, blockers: Obstacle[] = obstacles, limit = CITY_LIMIT) {
  const right = { x: Math.cos(vehicle.angle), z: -Math.sin(vehicle.angle) };
  const rear = { x: Math.sin(vehicle.angle), z: Math.cos(vehicle.angle) };
  const axes = [{x:1,z:0}, {x:0,z:1}, right, rear];
  return [{x:0,z:3.9,width:2.35,depth:2.1},{x:-1.65,z:.75,width:.55,depth:2.25},{x:1.7,z:.75,width:.65,depth:2.25}].every(rect=>{
    const center={x:vehicle.x+right.x*rect.x+rear.x*rect.z,z:vehicle.z+right.z*rect.x+rear.z*rect.z};
    for(const a of [-1,1])for(const b of [-1,1]) {
      if(Math.abs(center.x+a*right.x*rect.width+b*rear.x*rect.depth)>limit || Math.abs(center.z+a*right.z*rect.width+b*rear.z*rect.depth)>limit)return false;
    }
    return !blockers.some(box=>axes.every(axis=>{
      const distance=Math.abs((box.x-center.x)*axis.x+(box.z-center.z)*axis.z);
      const serviceRadius=rect.width*Math.abs(right.x*axis.x+right.z*axis.z)+rect.depth*Math.abs(rear.x*axis.x+rear.z*axis.z);
      return distance<serviceRadius+(box.halfX+.15)*Math.abs(axis.x)+(box.halfZ+.15)*Math.abs(axis.z);
    }));
  });
}

export class PassengerTransfer {
  phase: TransferPhase = 'stowed';
  elapsed = 0;
  private boardingFrom = { x:0,z:4.5,yaw:Math.PI,speed:0 };
  get locked() { return this.phase !== 'stowed'; }
  get progress() { return this.phase==='stowed' || this.phase==='outside' ? 0 : this.elapsed/transferDurations[this.phase]; }
  get pose() {
    const progress=this.phase === 'stowed' || this.phase === 'outside' ? 0 : this.elapsed/transferDurations[this.phase];
    const pose=transferPose(this.phase,progress);
    if (this.phase === 'aligning') {
      const t=ease(progress); pose.grandmaX=lerp(this.boardingFrom.x,0,t); pose.grandmaZ=lerp(this.boardingFrom.z,4.5,t);
      const turn=Math.atan2(Math.sin(Math.PI-this.boardingFrom.yaw),Math.cos(Math.PI-this.boardingFrom.yaw));
      pose.grandmaYaw=this.boardingFrom.yaw+turn*t;
    }
    return pose;
  }
  request(vehicle: VehicleState, chair = { x:0,z:4.5,yaw:Math.PI,speed:0 }) {
    if (this.phase === 'outside') {
      if (Math.hypot(chair.x,chair.z-4.5)>BOARDING_RADIUS) return '請回到巴士後方的上車標記';
      if (Math.abs(chair.speed)>.05) return '請先停穩輪椅，再按 E 上車';
      this.boardingFrom={...chair}; this.phase = 'aligning'; this.elapsed = 0; return '';
    }
    if (this.phase !== 'stowed') return '請等候接送動畫完成';
    if (Math.abs(vehicle.speed) > .05) return '請先煞車停妥，再讓奶奶下車';
    if (!transferAreaClear(vehicle)) return '司機通道或車後空間不足，請移至空曠處停車';
    this.phase = 'driverExit'; this.elapsed = 0; return '';
  }
  step(dt: number) {
    if (this.phase === 'stowed' || this.phase === 'outside') return;
    this.elapsed += Math.max(0, Math.min(dt, .1));
    const duration = transferDurations[this.phase];
    if (this.elapsed >= duration) { this.elapsed -= duration; this.phase = next[this.phase]!; }
  }
  reset() { this.phase = 'stowed'; this.elapsed = 0; this.boardingFrom={x:0,z:4.5,yaw:Math.PI,speed:0}; }
}
