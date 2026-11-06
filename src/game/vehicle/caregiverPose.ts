import {driverPose} from './driverAssistance.ts';

export const CAREGIVER_OFFSET=.72;
export const CAREGIVER_RADIUS=.44;
export const CAREGIVER_WAIT={x:1.55,z:4.5,yaw:-Math.PI/2};
export function caregiverBehind(x:number,z:number,yaw:number) {
  return {x:x-Math.sin(yaw)*CAREGIVER_OFFSET,z:z-Math.cos(yaw)*CAREGIVER_OFFSET};
}
export function caregiverPose(phase:string,progress:number,chair:{x:number;z:number;yaw:number}) {
  const t=Math.max(0,Math.min(1,progress)),ease=t*t*(3-2*t);
  const smooth=(value:number)=>{const u=Math.max(0,Math.min(1,value));return u*u*(3-2*u);};
  if(phase==='stowed')return{x:.55,y:.75,z:-1.10,yaw:Math.PI,seated:1,door:0,grip:0,walking:0};
  if(phase==='driverExit'||phase==='driverEnter'){
    const driver=driverPose(phase,progress);
    return{x:-driver.x,y:driver.y,z:driver.z,yaw:Math.PI*2-driver.yaw,seated:driver.seated,door:driver.door,grip:0,walking:driver.walking};
  }
  if(phase==='driverWalk'||phase==='driverReturn'){
    const u=phase==='driverWalk'?t:1-t,reach=smooth((u-.8)/.2);
    const yaw=phase==='driverWalk'?Math.PI/2*(1-smooth(t/.2))-Math.PI/2*reach:Math.PI*1.5-Math.PI/2*smooth(t/.2)+Math.PI/2*smooth((t-.8)/.2);
    return{x:1.85+(CAREGIVER_WAIT.x-1.85)*reach,y:.14,z:-.75+(CAREGIVER_WAIT.z+.75)*smooth(u/.9),yaw,seated:0,door:1-smooth(u/.22),grip:0,walking:Math.sin(Math.PI*t)};
  }
  const behind=caregiverBehind(chair.x,chair.z,chair.yaw);
  // Stay clear while the driver pulls the chair off the lowered deck. The
  // wheelchair is stationary before the driver steps aside and hands it over.
  const approach=phase==='outside'||phase==='driverBackToControls'?1:phase==='driverHandoff'?smooth((t-.45)/.55):phase==='aligning'?1-ease:0;
  const grip=phase==='driverHandoff'?smooth((t-.6)/.4):approach;
  const turn=Math.atan2(Math.sin(chair.yaw-CAREGIVER_WAIT.yaw),Math.cos(chair.yaw-CAREGIVER_WAIT.yaw));
  return {x:CAREGIVER_WAIT.x+(behind.x-CAREGIVER_WAIT.x)*approach,z:CAREGIVER_WAIT.z+(behind.z-CAREGIVER_WAIT.z)*approach,
    yaw:CAREGIVER_WAIT.yaw+turn*approach,y:.14,seated:0,door:0,grip,walking:phase==='driverHandoff'&&t>.45?Math.sin(Math.PI*(t-.45)/.55):phase==='aligning'?Math.sin(Math.PI*t):0};
}

