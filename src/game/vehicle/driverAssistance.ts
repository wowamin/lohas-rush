import type { TransferPhase } from './passengerTransfer.ts';
import { cabinWheelchairPosition, groundWheelchairPosition, DRIVER_CHAIR_OFFSET } from './transferPath.ts';

export const DRIVER_OPERATOR = { x:-1.30, z:2.60, radius:.45 };
export type DriverPose = { x:number; y:number; z:number; yaw:number; seated:number; walking:number; operate:number; door:number; grip:number; crouch:number };
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export function driverPose(phase:TransferPhase,progress=0):DriverPose {
  const pose:DriverPose={x:DRIVER_OPERATOR.x,y:.14,z:DRIVER_OPERATOR.z,yaw:Math.PI/2,seated:0,walking:0,operate:0,door:0,grip:0,crouch:0};
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
  if(phase==='driverDeckApproach') {
    const u=smooth(progress),reach=smooth((progress-.3)/.7);
    pose.x=mix(DRIVER_OPERATOR.x,0,reach);pose.z=mix(DRIVER_OPERATOR.z,2.75+DRIVER_CHAIR_OFFSET,smooth(progress/.3));
    pose.yaw=mix(Math.PI/2,Math.PI,u);pose.crouch=.25*u;pose.walking=Math.sin(Math.PI*progress);
    return pose;
  }
  if(phase==='driverDeckGrip'||phase==='exiting'||phase==='driverGroundStop') {
    const chair=groundWheelchairPosition(phase==='driverDeckGrip'?0:phase==='exiting'?progress:1);
    pose.x=chair.x;pose.z=chair.z+DRIVER_CHAIR_OFFSET;pose.yaw=Math.PI;pose.crouch=.25;
    pose.grip=phase==='driverDeckGrip'?smooth(progress):1;pose.walking=phase==='exiting'?Math.sin(Math.PI*progress):0;
    return pose;
  }
  if(phase==='driverHandoff') {
    const leave=smooth(progress/.45);
    pose.x=-1.2*leave;pose.z=4.5+DRIVER_CHAIR_OFFSET;pose.yaw=mix(Math.PI,Math.PI/2,leave);
    pose.grip=1-smooth(progress/.2);pose.crouch=.25*(1-leave);pose.walking=progress<.45?Math.sin(Math.PI*progress/.45):0;
    return pose;
  }
  if(phase==='driverBackToControls') {
    const route=[[-1.2,4.5+DRIVER_CHAIR_OFFSET],[-1.5,4.5+DRIVER_CHAIR_OFFSET],[-1.5,DRIVER_OPERATOR.z],[DRIVER_OPERATOR.x,DRIVER_OPERATOR.z]];
    const u=Math.max(0,Math.min(1,progress))*3,index=Math.min(2,Math.floor(u)),t=smooth(u-index);
    pose.x=mix(route[index][0],route[index+1][0],t);pose.z=mix(route[index][1],route[index+1][1],t);
    pose.yaw=Math.PI/2+Math.PI/2*Math.sin(Math.PI*progress);pose.walking=Math.sin(Math.PI*progress);
    return pose;
  }
  if(['driverClimb','driverBoard','driverStepDown','driverLeave'].includes(phase)) {
    const exiting=phase==='driverStepDown'||phase==='driverLeave';
    const u=exiting?1-progress:progress;
    // Walk behind the bumper, climb two separate treads, then enter through
    // the rear doorway. The route never cuts through a side body panel.
    const route=[[-1.30,.14,2.60],[-1.30,.14,3.31],[-1.18,.34,3.31],[-.94,.54,3.31],[-.50,.75,3.31],[0,.75,3.31]];
    if(phase==='driverClimb'||phase==='driverLeave')route.push([-.43,.75,.42+DRIVER_CHAIR_OFFSET]);
    const segment=Math.min(route.length-2,Math.floor(Math.max(0,Math.min(1,u))*(route.length-1)));
    const t=smooth(u*(route.length-1)-segment),a=route[segment],b=route[segment+1];
    pose.x=mix(a[0],b[0],t);pose.y=mix(a[1],b[1],t);pose.z=mix(a[2],b[2],t);
    pose.yaw=mix(Math.PI/2,Math.PI,smooth(u/.8));
    pose.crouch=.25*smooth((pose.y-.14)/.61);pose.walking=Math.sin(Math.PI*Math.max(0,Math.min(1,progress)));
    return pose;
  }
  if(['driverGrip','rollingOut','driverSecure','driverGripIn','rollingIn','driverRelease'].includes(phase)) {
    const moving=phase==='rollingOut'||phase==='rollingIn';
    const position=phase==='driverGrip'||phase==='driverRelease'?cabinWheelchairPosition(0)
      :moving?cabinWheelchairPosition(phase==='rollingOut'?progress:1-progress):cabinWheelchairPosition(1);
    pose.x=position.x;pose.z=position.z+DRIVER_CHAIR_OFFSET;pose.y=.75;pose.yaw=Math.PI;pose.crouch=.25;
    pose.grip=phase==='driverGrip'||phase==='driverGripIn'?smooth(progress):phase==='driverSecure'||phase==='driverRelease'?1-smooth(progress):1;
    pose.walking=moving?Math.sin(Math.PI*Math.max(0,Math.min(1,progress))):0;
    return pose;
  }
  pose.operate=['opening','deploying','lowering','raising','folding','closing'].includes(phase)?1:0;
  return pose;
}
