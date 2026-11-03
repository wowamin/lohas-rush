import { roads, nodeById, polar, RING_SEGMENTS, cityBlocks } from './roadNetwork.ts';
import { landscapeObstacles } from './landscape.ts';
import { servicePoints } from './services.ts';
import { generateCity, type SpawnPoint } from './cityGenerator.ts';
import { centerDistrictIds } from './streetGrid.ts';

export const CITY_SEED = 20261103;
export const centerIds = ['daihe', 'annan', 'longshan', 'yihe', 'xinying'];
export const CITY_GENERATION_RULES = { minShopGap: 8, minCenterDistance: 220, centerDistricts: centerDistrictIds };
export const shopPrefabs = [
  { id: 'grocer', name: '巷口雜貨店', color: '#c8d8b7', height: 5 },
  { id: 'breakfast', name: '街角早餐店', color: '#edc6a9', height: 4 },
  { id: 'florist', name: '社區花店', color: '#d8c2db', height: 5 },
  { id: 'bakery', name: '暖心麵包店', color: '#ead69e', height: 6 },
  { id: 'repair', name: '街坊修車舖', color: '#b4cbd1', height: 4 },
];
const fixedObstacles = [...landscapeObstacles, ...servicePoints];
// Reserve roadside lots with clearance for the largest placeholder (12 x 12 m).
const outerLots: SpawnPoint[] = Array.from({ length: RING_SEGMENTS / 2 }, (_, i) => {
  const index = i * 2, [x, z] = polar(82, index);
  return { id: `outer-lot-${index}`, position: [x, 0, z] as [number, number, number],
    rotation: Math.round(Math.atan2(-x, -z) / (Math.PI / 2)) * (Math.PI / 2),
    arrival: polar(64, index), roadNode: `1-${index}` };
});
export const spawnPoints: SpawnPoint[] = [...outerLots, ...cityBlocks.map(block => block.lot)].filter(point => {
  const [x, , z] = point.position;
  if (fixedObstacles.some(obstacle => Math.abs(x - obstacle.x) < 6 + obstacle.halfX + 1 && Math.abs(z - obstacle.z) < 6 + obstacle.halfZ + 1)) return false;
  return roads.every(road => {
    const [ax, az] = nodeById.get(road.from)!.point, [bx, bz] = nodeById.get(road.to)!.point;
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - ax - t * dx, z - az - t * dz) > Math.SQRT2 * 6 + road.width / 2;
  });
});
export const generatedCity = generateCity({ spawnPoints, normalShops: shopPrefabs.map(prefab => prefab.id), sunCareCenters: centerIds, seed: CITY_SEED, ...CITY_GENERATION_RULES });
