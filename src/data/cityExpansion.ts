import type { Road, RoadNode } from './roadNetwork.ts';
import type { Building } from './city.ts';

export const ORIGINAL_CITY_LIMIT = 448;
export const CITY_AREA_MULTIPLIER = 1.30;
export const EXPANDED_CITY_LIMIT = ORIGINAL_CITY_LIMIT * Math.sqrt(CITY_AREA_MULTIPLIER);
export const EXPANSION_AVENUE = 480;
export const expansionBridgeCenters = [-EXPANSION_AVENUE, EXPANSION_AVENUE];
export const expansionNodes: RoadNode[] = [];
export const expansionRoads: Road[] = [];
const coordinates = new Map<string, string>();
function node(x: number, z: number) {
  const key = `${x},${z}`, existing = coordinates.get(key);
  if (existing) return existing;
  const id = `expansion-${x}-${z}`; coordinates.set(key, id); expansionNodes.push({ id, point: [x, z] }); return id;
}
function avenue(points: [number, number][]) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const bridge = a[1] === b[1] && Math.min(a[0], b[0]) === 80 && Math.max(a[0], b[0]) === 100;
    expansionRoads.push({ from: node(...a), to: node(...b), width: 16, kind: bridge ? 'bridge' : 'street' });
  }
}
avenue([[-480, -480], [-212, -480], [80, -480], [100, -480], [480, -480]]);
avenue([[480, -480], [480, 0], [480, 480]]);
avenue([[480, 480], [100, 480], [80, 480], [0, 480], [-480, 480]]);
avenue([[-480, 480], [-480, 0], [-480, -480]]);
for (const [from, x, z] of [
  ['artery-west-mid', -480, 0], ['artery-east-mid', 480, 0],
  ['artery-west-top', -212, -480], ['far-south-2-4', 0, 480],
] as const) expansionRoads.push({ from, to: node(x, z), width: 12, kind: 'street' });

// Separate from seeded building lots: expansion must not reshuffle existing missions/shops.
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
