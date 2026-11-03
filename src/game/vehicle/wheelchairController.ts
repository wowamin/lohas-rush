import { CITY_LIMIT, obstacles, type Obstacle } from '../../data/city.ts';
import type { DrivingInput, VehicleState } from './drivingPhysics.ts';
import { DRIVER_OPERATOR } from './driverAssistance.ts';
import { CAREGIVER_OFFSET,CAREGIVER_RADIUS } from './caregiverPose.ts';

export const WHEELCHAIR_RADIUS = .48;
export const WHEELCHAIR_MAX_SPEED = 1.8;
export const BOARDING_RADIUS = .6;
export function wheelchairDock(bus: Pick<VehicleState,'x'|'z'|'angle'>): VehicleState {
  return { x:bus.x+Math.sin(bus.angle)*4.5, z:bus.z+Math.cos(bus.angle)*4.5, angle:bus.angle, speed:0 };
}
export function wheelchairLocal(chair: VehicleState, bus: Pick<VehicleState,'x'|'z'|'angle'>) {
  const dx=chair.x-bus.x, dz=chair.z-bus.z, cos=Math.cos(bus.angle), sin=Math.sin(bus.angle);
  return { x:cos*dx-sin*dz, z:sin*dx+cos*dz, yaw:Math.atan2(Math.sin(chair.angle+Math.PI-bus.angle),Math.cos(chair.angle+Math.PI-bus.angle)), speed:chair.speed };
}
export function wheelchairCollides(x: number, z: number, bus: Pick<VehicleState,'x'|'z'|'angle'>, blockers: Obstacle[] = obstacles, limit = CITY_LIMIT,angle=bus.angle) {
  const circleBlocked=(x:number,z:number,radius:number)=>{
  if (Math.abs(x)+radius>limit || Math.abs(z)+radius>limit) return true;
  const hits = (dx:number,dz:number,hx:number,hz:number) => Math.hypot(Math.max(Math.abs(dx)-hx,0),Math.max(Math.abs(dz)-hz,0)) < radius;
  if (blockers.some(o=>hits(x-o.x,z-o.z,o.halfX,o.halfZ))) return true;
  const local=wheelchairLocal({x,z,angle:0,speed:0},bus);
  if(Math.hypot(local.x-DRIVER_OPERATOR.x,local.z-DRIVER_OPERATOR.z)<radius+DRIVER_OPERATOR.radius)return true;
  return hits(local.x,local.z,1.30,2.17);
  };
  return circleBlocked(x,z,WHEELCHAIR_RADIUS)||circleBlocked(x+Math.sin(angle)*CAREGIVER_OFFSET,z+Math.cos(angle)*CAREGIVER_OFFSET,CAREGIVER_RADIUS);
}
export function stepWheelchair(chair: VehicleState, input: DrivingInput, bus: Pick<VehicleState,'x'|'z'|'angle'>, dt = 1/120, blockers: Obstacle[] = obstacles, limit = CITY_LIMIT) {
  const time=Math.max(0,Math.min(dt,.05));
  const angle=chair.angle+input.steer*1.8*time;
  if(!wheelchairCollides(chair.x,chair.z,bus,blockers,limit,angle))chair.angle=angle;
  const target=input.brake ? 0 : input.throttle>0 ? WHEELCHAIR_MAX_SPEED : input.throttle<0 ? -1 : 0;
  const rate=input.brake ? 8 : target ? 2.8 : 4;
  chair.speed += Math.sign(target-chair.speed)*Math.min(Math.abs(target-chair.speed),rate*time);
  if (Math.abs(chair.speed)<.001) chair.speed=0;
  const x=chair.x-Math.sin(chair.angle)*chair.speed*time, z=chair.z-Math.cos(chair.angle)*chair.speed*time;
  if (wheelchairCollides(x,z,bus,blockers,limit,chair.angle)) chair.speed=0;
  else { chair.x=x; chair.z=z; }
}
