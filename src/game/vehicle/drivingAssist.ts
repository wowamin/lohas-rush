import { findRoadRoute, nodeById, roads, type Point } from '../../data/roadNetwork.ts';
import { collides, CAR_RADIUS } from '../collision/collisionSystem.ts';
import type { DrivingInput, VehicleState } from './drivingPhysics.ts';

export type AssistMode = 'off' | 'cruise' | 'route';
export const ASSIST_CRUISE_SPEED = 5; // 18 km/h; steering stays with the player.
export const ASSIST_ROUTE_SPEED = 10; // 36 km/h on straight sections.
const clamp = (n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const distance = (a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const idle:DrivingInput = {throttle:0,steer:0,brake:true};

// Join the nearest declared street before routing through its connected nodes.
// Never jump from an arbitrary off-road position to a node across a city block.
export function planAssistedRoute(s:VehicleState,destination:string):Point[] {
  if(!nodeById.has(destination)||![s.x,s.z,s.angle].every(Number.isFinite)||collides(s.x,s.z))return [];
  let nearest:{point:Point;from:string;to:string;distance:number;width:number}|undefined;
  for(const road of roads){
    const a=nodeById.get(road.from)!.point,b=nodeById.get(road.to)!.point;
    const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((s.x-a[0])*dx+(s.z-a[1])*dz)/(dx*dx+dz*dz),0,1);
    const point:Point=[a[0]+dx*t,a[1]+dz*t],d=distance([s.x,s.z],point);
    if(!nearest||d<nearest.distance)nearest={point,from:road.from,to:road.to,distance:d,width:road.width};
  }
  if(!nearest||nearest.distance>nearest.width/2-CAR_RADIUS+2)return [];
  const options=[nearest.from,nearest.to].map(start=>{
    const route=[nearest.point,...findRoadRoute(start,destination)].filter((p,i,all)=>!i||distance(p,all[i-1])>.01);
    const first=route.find(p=>distance(p,[s.x,s.z])>2.4);
    const desired=first?Math.atan2(s.x-first[0],s.z-first[1]):s.angle;
    const error=Math.atan2(Math.sin(desired-s.angle),Math.cos(desired-s.angle));
    const cost=route.reduce((sum,p,i)=>sum+(i?distance(p,route[i-1]):distance(p,[s.x,s.z])),0)+Math.abs(error)*8;
    return{route,cost};
  }).sort((a,b)=>a.cost-b.cost);
  for(const {route} of options){
    const points:Point[]=[[s.x,s.z],...route];
    const clear=points.every((p,i)=>{
      if(!i)return true;
      const a=points[i-1],steps=Math.max(1,Math.ceil(distance(a,p)));
      for(let j=1;j<=steps;j++)if(collides(a[0]+(p[0]-a[0])*j/steps,a[1]+(p[1]-a[1])*j/steps))return false;
      return true;
    });
    if(clear)return route;
  }
  return [];
}

export class DrivingAssist {
  private mode:AssistMode='off';
  private points:Point[]=[];
  private index=0;
  private bestDistance=Infinity;
  private stalled=0;
  start(mode:AssistMode,s:VehicleState,destination:string) {
    this.mode=mode;this.points=mode==='route'?planAssistedRoute(s,destination):[];
    this.index=0;this.bestDistance=Infinity;this.stalled=0;
    return mode!=='route'||this.points.length>0;
  }
  update(s:VehicleState,manualSteer:number,dt:number):{input:DrivingInput;stop?:'arrived'|'blocked'|'lost'} {
    if(this.mode==='off')return{input:idle};
    if(this.mode==='route'&&!this.points.length)return{input:idle,stop:'lost'};
    let steering=manualSteer,targetSpeed=ASSIST_CRUISE_SPEED;
    if(this.mode==='route'){
      while(this.index<this.points.length-1&&distance([s.x,s.z],this.points[this.index])<2.4){this.index++;this.bestDistance=Infinity;this.stalled=0;}
      const target=this.points[this.index],d=distance([s.x,s.z],target),last=this.index===this.points.length-1;
      if(last&&d<3)return{input:idle,stop:'arrived'};
      const desired=Math.atan2(s.x-target[0],s.z-target[1]);
      const error=Math.atan2(Math.sin(desired-s.angle),Math.cos(desired-s.angle));
      steering=clamp(error*2.8,-1,1);
      targetSpeed=Math.abs(error)>.4||d<14?4:ASSIST_ROUTE_SPEED;
      if(last)targetSpeed=Math.min(targetSpeed,Math.max(1.5,d*.65));
      if(d<this.bestDistance-.25){this.bestDistance=d;this.stalled=0;}else this.stalled+=dt;
      if(this.stalled>16)return{input:idle,stop:'lost'};
    }
    const probe=Math.max(.8,Math.max(0,s.speed)*.25+.8);
    for(let d=.4;d<=probe;d+=.4)if(collides(s.x-Math.sin(s.angle)*d,s.z-Math.cos(s.angle)*d))return{input:idle,stop:'blocked'};
    return{input:{throttle:clamp((targetSpeed-s.speed)*.8+.12,0,1),steer:steering,brake:s.speed>targetSpeed+.5}};
  }
}
