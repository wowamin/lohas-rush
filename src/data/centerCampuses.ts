import type { SpawnPoint } from './cityGenerator.ts';
import type { Point } from './roadNetwork.ts';

export type CenterCampus = {
  id: string; name: string; district: string;
  x: number; z: number; rotation: number;
  courtHalfWidth: number; parkingXs: readonly number[];
};

// Deliberate game layout, independent of shop-generation seed and real geography.
// Local +Z faces the forecourt; the boulevard is 80 m in front of the building.
export const centerCampuses: readonly CenterCampus[] = [
  { id: 'daihe', name: '大和', district: 'northwest', x: -320, z: -560, rotation: Math.PI, courtHalfWidth: 40, parkingXs: [-21,-14,14,21] },
  { id: 'annan', name: '安南', district: 'southwest', x: -560, z: -200, rotation: -Math.PI/2, courtHalfWidth: 40, parkingXs: [-21,-14,14,21] },
  { id: 'longshan', name: '七股龍山', district: 'far-south', x: -280, z: 560, rotation: 0, courtHalfWidth: 46, parkingXs: [-22,-14,-6,6,14,22] },
  { id: 'yihe', name: '七股義合', district: 'southeast', x: 320, z: 560, rotation: 0, courtHalfWidth: 46, parkingXs: [-22,-14,-6,6,14,22] },
  { id: 'xinying', name: '新營', district: 'northeast', x: 560, z: -280, rotation: Math.PI/2, courtHalfWidth: 40, parkingXs: [-21,-14,14,21] },
];
export const CAMPUS_LANE_WIDTH = 12;
export const CAMPUS_ARRIVAL_OFFSET = 40;
export const CAMPUS_BOULEVARD_OFFSET = 80;
export function campusPoint(site: CenterCampus, x: number, z: number): Point {
  const c=Math.cos(site.rotation),s=Math.sin(site.rotation);
  const round=(value:number)=>Math.round(value*1e6)/1e6;
  return [round(site.x+x*c+z*s),round(site.z+z*c-x*s)];
}
export const campusArrivalNode = (site: CenterCampus) => `campus-${site.id}-arrival`;
export const campusSpawnPoints: SpawnPoint[] = centerCampuses.map(site=>({
  id:`campus-${site.id}`,position:[site.x,0,site.z],rotation:site.rotation,
  arrival:campusPoint(site,0,CAMPUS_ARRIVAL_OFFSET),roadNode:campusArrivalNode(site),district:site.district,
}));

function bounds(site:CenterCampus,x:number,z:number,halfX:number,halfZ:number,kind:string){
  const [wx,wz]=campusPoint(site,x,z),c=Math.abs(Math.cos(site.rotation)),s=Math.abs(Math.sin(site.rotation));
  return{x:wx,z:wz,halfX:halfX*c+halfZ*s,halfZ:halfZ*c+halfX*s,kind};
}
// Reserved landscape space is NOT a driving collider: keep street trees/shops out.
export const campusReservations=centerCampuses.map(site=>bounds(site,0,27,site.courtHalfWidth+2,43,'campus-reservation'));
export const campusFixtures=centerCampuses.flatMap(site=>[
  ...[-1,1].map(side=>({...bounds(site,side*(site.courtHalfWidth-3),14,1.4,2,'campus-planter'),height:2})),
  ...[-1,1].map(side=>({...bounds(site,side*20,18,1.4,.5,'campus-bench'),height:1})),
  {...bounds(site,-site.courtHalfWidth+1,54,1.5,.22,'campus-sign'),height:3.3},
]);
