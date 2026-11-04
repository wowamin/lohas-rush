import type { TransferPhase } from './passengerTransfer.ts';

export const DRIVER_OPERATOR = { x:-1.30, z:2.60, radius:.45 };
export type DriverPose = { x:number; y:number; z:number; yaw:number; seated:number; walking:number; operate:number; door:number };
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export function driverPose(phase:TransferPhase,progress=0):DriverPose {
  const pose:DriverPose={x:DRIVER_OPERATOR.x,y:.14,z:DRIVER_OPERATOR.z,yaw:Math.PI/2,seated:0,walking:0,operate:0,door:0};
  if(phase==='stowed') return {...pose,x:-.55,y:.75,z:-1.10,yaw:Math.PI,seated:1};
  if(phase==='driverExit' || phase==='driverEnter') {
    const u=phase==='driverExit'?progress:1-progress;
    // Leave the seat sideways before moving behind its fixed backrest.
    const move=smooth((u-.30)/.70), reposition=smooth((u-.70)/.30);
    pose.x=mix(-.55,-1.85,move);pose.y=mix(.75,.14,move);pose.z=mix(-1.10,-.75,reposition);
    pose.yaw=phase==='driverExit'?mix(Math.PI,Math.PI*1.5,smooth((u-.35)/.35)):mix(Math.PI/2,Math.PI,smooth(progress/.75));pose.seated=1-move;
    pose.walking=Math.sin(Math.PI*move);pose.door=smooth(u/.20);
    return pose;
  }
  if(phase==='driverWalk' || phase==='driverReturn') {
    const u=phase==='driverWalk'?progress:1-progress;
    const reach=smooth((u-.80)/.20);
    pose.x=mix(-1.85,DRIVER_OPERATOR.x,reach);pose.z=mix(-.75,DRIVER_OPERATOR.z,smooth(u/.80));
    if(phase==='driverWalk') pose.yaw=mix(Math.PI*1.5,Math.PI*2,smooth(progress/.2))+(Math.PI/2)*reach;
    else pose.yaw=mix(Math.PI*2.5,Math.PI*3,smooth(progress/.20))-(Math.PI/2)*smooth((progress-.8)/.2);
    pose.walking=Math.sin(Math.PI*progress);pose.door=1-smooth(u/.22);
    return pose;
  }
  pose.operate=['opening','deploying','lowering','raising','folding','closing'].includes(phase)?1:0;
  return pose;
}
