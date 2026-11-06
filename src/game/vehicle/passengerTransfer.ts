import { CITY_LIMIT, obstacles, type Obstacle } from '../../data/city.ts';
import type { VehicleState } from './drivingPhysics.ts';
import { BOARDING_RADIUS } from './wheelchairController.ts';
import { cabinWheelchairPosition, groundWheelchairPosition } from './transferPath.ts';

export const transferDurations = {
  driverExit:1.5, driverWalk:1.8, driverReturn:1.8, driverEnter:1.5,
  opening: 1, deploying: 1.2, driverClimb:2.8, driverGrip:.6, rollingOut:3, driverSecure:.6, driverStepDown:2.2, lowering: 1.4,
  driverDeckApproach:1.6, driverDeckGrip:.6, exiting:2.4, driverGroundStop:.5, driverHandoff:1.6, driverBackToControls:1.7,
  aligning: .8, boarding: 1.4, caregiverClear:1, raising: 1.4, driverBoard:2.2, driverGripIn:.6, rollingIn:3, driverRelease:.6, driverLeave:2.8, folding: 1.2, closing: 1,
} as const;
export type TransferPhase = 'stowed' | 'outside' | keyof typeof transferDurations;
export const transferLabels: Record<TransferPhase, string> = {
  driverExit:'司機大哥下車準備',driverWalk:'司機前往車尾控制台',driverReturn:'司機返回駕駛座',driverEnter:'司機上車並關妥車門',
  stowed: '兩位乘客在車內', opening: '後車門開啟中', deploying: '升降平台展開中',
  driverClimb:'司機踩上平台進入車廂', driverGrip:'司機握妥輪椅把手', rollingOut: '司機協助奶奶移至平台', driverSecure:'司機固定輪椅', driverStepDown:'司機離開平台準備下降', lowering: '平台下降中',
  driverDeckApproach:'司機走上落地平台', driverDeckGrip:'司機握妥輪椅準備拉出', exiting:'司機將奶奶拉至地面', driverGroundStop:'司機將輪椅停穩', driverHandoff:'照服員接手輪椅', driverBackToControls:'司機退回控制台',
  outside: '操控奶奶輪椅・爺爺留在車內', aligning: '照服員靠近並對準輪椅', boarding: '照服員推奶奶上升降平台', caregiverClear:'照服員退開，司機準備操作升降平台', raising: '平台上升中',
  driverBoard:'司機踩上平台協助上車', driverGripIn:'司機握妥輪椅準備推入', rollingIn: '司機大哥推奶奶上車板', driverRelease:'司機將奶奶安置在車廂地板', driverLeave:'司機走樓梯下車', folding: '司機操作升降平台收起', closing: '後車門關閉中',
};
const next: Partial<Record<TransferPhase, TransferPhase>> = {
  driverExit:'driverWalk',driverWalk:'opening',driverReturn:'driverEnter',driverEnter:'stowed',
  opening:'deploying', deploying:'driverClimb', driverClimb:'driverGrip', driverGrip:'rollingOut', rollingOut:'driverSecure', driverSecure:'driverStepDown', driverStepDown:'lowering', lowering:'driverDeckApproach', driverDeckApproach:'driverDeckGrip', driverDeckGrip:'exiting', exiting:'driverGroundStop', driverGroundStop:'driverHandoff', driverHandoff:'driverBackToControls', driverBackToControls:'outside',
  aligning:'boarding', boarding:'caregiverClear', caregiverClear:'raising', raising:'driverBoard', driverBoard:'driverGripIn', driverGripIn:'rollingIn', rollingIn:'driverRelease', driverRelease:'driverLeave', driverLeave:'folding', folding:'closing', closing:'driverReturn',
};
const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x*x*(3-2*x); };
const lerp = (a: number, b: number, t: number) => a + (b-a)*t;
export type TransferPose = { hatch: number; fold: number; deckY: number; grandmaX: number; grandmaY: number; grandmaZ: number; grandmaYaw: number; grandmaInside: boolean };

export function transferPose(phase: TransferPhase, progress = 0): TransferPose {
  const t = ease(progress);
  const pose: TransferPose = { hatch: 1, fold: 0, deckY: .75, grandmaX: 0, grandmaY: .75, grandmaZ: 2.75, grandmaYaw: Math.PI, grandmaInside: false };
  const seated = () => { pose.grandmaX = -.43; pose.grandmaY = .75; pose.grandmaZ = .42; pose.grandmaInside = true; };
  if (['stowed','driverExit','driverWalk','driverReturn','driverEnter','opening','deploying','driverClimb','driverGrip','driverRelease','driverLeave','folding','closing'].includes(phase)) {
    seated();
    const closed=['stowed','driverExit','driverWalk','driverReturn','driverEnter'].includes(phase);
    pose.hatch = closed ? 0 : phase === 'opening' ? t : phase === 'closing' ? 1-t : 1;
    pose.fold = phase === 'deploying' ? 1-t : phase === 'folding' ? t : ['driverClimb','driverGrip','driverRelease','driverLeave'].includes(phase) ? 0 : 1;
  } else if (phase === 'rollingOut' || phase === 'rollingIn') {
    const u = phase === 'rollingOut' ? progress : 1-progress;
    const chair=cabinWheelchairPosition(u);pose.grandmaX=chair.x;pose.grandmaZ=chair.z;
    pose.grandmaInside = pose.grandmaZ < 2;
  } else if (['driverSecure','driverStepDown','driverBoard','driverGripIn'].includes(phase)) {
    // Hold the occupied platform at cabin height until assistance is complete.
  } else if (phase === 'lowering' || phase === 'raising') {
    pose.deckY = lerp(.75, .14, phase === 'lowering' ? t : 1-t); pose.grandmaY = pose.deckY;
  } else if (phase==='driverDeckApproach'||phase==='driverDeckGrip') {
    pose.deckY=.14;pose.grandmaY=.14;
  } else if (phase==='caregiverClear') {
    pose.deckY=.14;pose.grandmaY=.14;pose.grandmaZ=2.75;
  } else {
    pose.deckY = .14; pose.grandmaY = .14;
    pose.grandmaZ = ['outside','aligning','driverGroundStop','driverHandoff','driverBackToControls'].includes(phase) ? 4.5 : phase==='exiting'?groundWheelchairPosition(progress).z:lerp(4.5,2.75,t);
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
