import type { Road, RoadNode } from './roadNetwork.ts';
import type { Building } from './city.ts';
import { centerCampuses, campusPoint, campusArrivalNode, CAMPUS_ARRIVAL_OFFSET, CAMPUS_BOULEVARD_OFFSET, CAMPUS_LANE_WIDTH } from './centerCampuses.ts';

export const ORIGINAL_CITY_LIMIT = 448;
export const PREVIOUS_CITY_LIMIT = ORIGINAL_CITY_LIMIT * Math.sqrt(1.30);
export const CITY_AREA_MULTIPLIER = (720 / ORIGINAL_CITY_LIMIT) ** 2;
export const EXPANDED_CITY_LIMIT = ORIGINAL_CITY_LIMIT * Math.sqrt(CITY_AREA_MULTIPLIER);
export const EXPANSION_AVENUE = 480;
export const OUTER_AVENUE = 640;
export const expansionBridgeCenters = [-OUTER_AVENUE,-EXPANSION_AVENUE,EXPANSION_AVENUE,OUTER_AVENUE];
export const expansionNodes: RoadNode[] = [];
export const expansionRoads: Road[] = [];
const coordinates = new Map<string, string>();
function node(x: number, z: number, preferredId?: string) {
  const key = `${x},${z}`, existing = coordinates.get(key);
  if (existing) return existing;
  const id = preferredId ?? `expansion-${x}-${z}`; coordinates.set(key, id); expansionNodes.push({ id, point: [x, z] }); return id;
}
function avenue(points: [number, number][]) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const bridge = a[1] === b[1] && Math.min(a[0], b[0]) === 80 && Math.max(a[0], b[0]) === 100;
    expansionRoads.push({ from: node(...a), to: node(...b), width: 16, kind: bridge ? 'bridge' : 'street' });
  }
}
avenue([[-480, -480], [-212, -480], [0, -480], [80, -480], [100, -480], [480, -480]]);
avenue([[480, -480], [480, 0], [480, 480]]);
avenue([[480, 480], [100, 480], [80, 480], [0, 480], [-480, 480]]);
avenue([[-480, 480], [-480, 0], [-480, -480]]);
for (const [from, x, z] of [
  ['artery-west-mid', -480, 0], ['artery-east-mid', 480, 0],
  ['artery-west-top', -212, -480], ['far-south-2-4', 0, 480],
] as const) expansionRoads.push({ from, to: node(x, z), width: 12, kind: 'street' });

// The new outer boulevard is split at every campus entrance: visible joins are
// also navigation graph joins. Preserve the previous avenue and its four links.
const entrances=centerCampuses.flatMap(site=>[-32,32].map(x=>campusPoint(site,x,CAMPUS_BOULEVARD_OFFSET)));
for(const z of [-OUTER_AVENUE,OUTER_AVENUE]){
  const xs=[-OUTER_AVENUE,0,80,100,OUTER_AVENUE,...entrances.filter(p=>p[1]===z).map(p=>p[0])];
  avenue([...new Set(xs)].sort((a,b)=>a-b).map(x=>[x,z]));
}
for(const x of [-OUTER_AVENUE,OUTER_AVENUE]){
  const zs=[-OUTER_AVENUE,0,OUTER_AVENUE,...entrances.filter(p=>p[0]===x).map(p=>p[1])];
  avenue([...new Set(zs)].sort((a,b)=>a-b).map(z=>[x,z]));
}
avenue([[-480,0],[-OUTER_AVENUE,0]]);
avenue([[480,0],[OUTER_AVENUE,0]]);
avenue([[0,-480],[0,-OUTER_AVENUE]]);
avenue([[0,480],[0,OUTER_AVENUE]]);
expansionRoads.push({from:'1-20',to:node(0,-480),width:12,kind:'street'});
for(const site of centerCampuses){
  node(...campusPoint(site,0,CAMPUS_ARRIVAL_OFFSET),campusArrivalNode(site));
  const path=[[-32,CAMPUS_BOULEVARD_OFFSET],[-32,CAMPUS_ARRIVAL_OFFSET],[0,CAMPUS_ARRIVAL_OFFSET],[32,CAMPUS_ARRIVAL_OFFSET],[32,CAMPUS_BOULEVARD_OFFSET]];
  for(let i=1;i<path.length;i++){
    const a=campusPoint(site,path[i-1][0],path[i-1][1]),b=campusPoint(site,path[i][0],path[i][1]);
    expansionRoads.push({from:node(...a),to:node(...b),width:CAMPUS_LANE_WIDTH,kind:'access'});
  }
}

// Original outer housing stays fixed; care centers now use the dedicated campuses.
const palette = ['#e6d9c3', '#dfc6bc', '#c9d8c1', '#d8cede'];
const placements: [number, number, number][] = [];
for (const side of [-1, 1]) for (const along of [-400, -304, -208, -112, 112, 208, 304, 400]) {
  placements.push([side * 500, along, side < 0 ? Math.PI / 2 : -Math.PI / 2]);
  placements.push([along, side * 500, side < 0 ? 0 : Math.PI]);
}
export const expansionBuildings: Building[] = placements.map(([x, z, rotation], index) => ({
  id: `expansion-home-${index + 1}`, name: '外圍住宅', x, z, halfX: 4, halfZ: 4,
  height: 5 + index % 3 * 2, color: palette[index % palette.length], rotation, residential: true,
  description: '新增外圍住宅，沿用既有幾何風格，不加入日照任務或抽選基地。',
}));
