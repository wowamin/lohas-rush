import { roads, nodeById, INNER_RADIUS, OUTER_RADIUS, RING_SEGMENTS, CITY_LIMIT, SPAWN, type Point } from './roadNetwork.ts';
import type { Obstacle } from './city.ts';

export type StreetFixture = { kind:'tree'|'streetlight'; x:number; z:number; rotation:number; roadIndex:number };
export const FURNITURE_CLEARANCE = 5.5;
export const TREE_SPACING = 14;
export const LIGHT_SPACING = 32;
export const SIDEWALK_WIDTH = 3.5;
const radius=(kind:StreetFixture['kind'])=>kind==='tree'?1.8:.25;
export function distanceToRoad(x:number,z:number,roadIndex:number) {
  const road=roads[roadIndex],a=nodeById.get(road.from)!.point,b=nodeById.get(road.to)!.point;
  const dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz;
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length2));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}

// The curb strip belongs to the street, not the adjacent building. Keep lamp
// heads facing traffic, with trees between lamps and a clear outer footway.
export function createStreetFurniture(blockers:readonly Obstacle[],entrances:readonly Point[]) {
  const fixtures:StreetFixture[]=[],reserved=[...entrances,[SPAWN.x,SPAWN.z] as Point];
  const place=(fixture:StreetFixture)=>{
    const {x,z,kind}=fixture,canopy=radius(kind),footprint=kind==='tree'?.35:.18;
    if(Math.max(Math.abs(x),Math.abs(z))+canopy>CITY_LIMIT)return;
    if(reserved.some(p=>Math.hypot(x-p[0],z-p[1])<10))return;
    if(blockers.some(b=>Math.hypot(Math.max(0,Math.abs(x-b.x)-b.halfX),Math.max(0,Math.abs(z-b.z)-b.halfZ))<canopy+.6))return;
    if(roads.some((road,index)=>distanceToRoad(x,z,index)<road.width/2+footprint+.3))return;
    if(fixtures.some(other=>Math.hypot(x-other.x,z-other.z)<(kind!==other.kind?FURNITURE_CLEARANCE:kind==='tree'?TREE_SPACING:LIGHT_SPACING*.75)))return;
    fixtures.push(fixture);
  };
  // Ring road segments are short chords. Space fixtures by arc length across
  // the entire ring rather than restarting a row at every segment.
  for(const kind of ['streetlight','tree'] as const){
    for(const [ringIndex,ring] of [INNER_RADIUS,OUTER_RADIUS].entries())for(const side of [-1,1]){
      const count=Math.floor(2*Math.PI*ring/(kind==='tree'?TREE_SPACING:LIGHT_SPACING));
      for(let i=0;i<count;i++){
        const angle=(i+(kind==='tree'?.5:0)+(side===1?.25:0))*Math.PI*2/count;
        const offset=ring+side*(8+1.0),x=Math.sin(angle)*offset,z=Math.cos(angle)*offset;
        place({kind,x,z,rotation:Math.atan2(side*Math.cos(angle),-side*Math.sin(angle)),roadIndex:ringIndex*RING_SEGMENTS+Math.floor(angle/(2*Math.PI)*RING_SEGMENTS)%RING_SEGMENTS});
      }
    }
    roads.forEach((road,roadIndex)=>{
      if(road.kind==='ring'||road.kind==='bridge')return;
      const a=nodeById.get(road.from)!.point,b=nodeById.get(road.to)!.point,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      if(length<28)return;
      const spacing=kind==='tree'?TREE_SPACING:LIGHT_SPACING;
      for(const side of [-1,1])for(let distance=12+(kind==='tree'?spacing*.5:0)+(side===1?spacing*.5:0);distance<length-12;distance+=spacing){
        const nx=dz/length*side,nz=-dx/length*side,offset=road.width/2+1;
        place({kind,x:a[0]+dx*distance/length+nx*offset,z:a[1]+dz*distance/length+nz*offset,rotation:Math.atan2(nz,-nx),roadIndex});
      }
    });
  }
  return fixtures;
}

export function fixtureObstacles(fixtures:readonly StreetFixture[]):Obstacle[] {
  return fixtures.map(f=>({x:f.x,z:f.z,halfX:f.kind==='tree'?.35:.18,halfZ:f.kind==='tree'?.35:.18,kind:f.kind}));
}
