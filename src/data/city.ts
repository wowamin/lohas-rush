import { locations } from './locations.ts';
import { servicePoints, type ServicePoint } from './services.ts';
import { landscapeObstacles } from './landscape.ts';
import { generatedCity, shopPrefabs } from './buildingLots.ts';
import { expansionBuildings } from './cityExpansion.ts';
export { locations, type Location } from './locations.ts';
export { CITY_LIMIT } from './roadNetwork.ts';
export type Obstacle = { x: number; z: number; halfX: number; halfZ: number; kind?: string };
export type Building = Obstacle & { id: string; name: string; height: number; color: string; location?: typeof locations[number]; service?: ServicePoint; description: string; residential?: boolean; shop?: boolean; lotId?: string; rotation?: number };
export const HEADQUARTERS_FOOTPRINT_SCALE = Math.sqrt(1.3);
export const buildings: Building[] = [
  ...locations.map(location => ({ id: location.id, name: location.name, x: location.position[0], z: location.position[2], halfX: location.id === 'daihe' || location.id === 'xinying' ? 7 : 6, halfZ: location.id === 'daihe' ? 6 : location.id === 'annan' || location.id === 'xinying' ? 7 : 6, height: location.id === 'daihe' ? 13 : location.id === 'annan' ? 9.2 : location.id === 'xinying' ? 27.6 : 7, color: location.color, location, lotId: location.lotId, rotation: location.rotation, description: location.id === 'daihe' ? '依使用者提供的永春大和日照中心外觀參考製作的遊戲示意建築，非實測重建。' : location.id === 'annan' ? '依使用者提供的樂活安南日照中心外觀參考製作的遊戲示意建築，非實測重建。' : location.id === 'xinying' ? '依使用者提供的樂活新營日照中心外觀參考製作的遊戲示意建築，非實測重建。' : '日照中心幾何佔位；待提供實景照片及授權。' })),
  ...generatedCity.shops.map(({ point, prefab }) => {
    const shop = shopPrefabs.find(item => item.id === prefab)!;
    return { id: `shop-${point.id}`, name: shop.name, x: point.position[0], z: point.position[2], halfX: 4.5, halfZ: 4.5,
      height: shop.height, color: shop.color, rotation: point.rotation, lotId: point.id, shop: true, description: '虛構街坊店家，程式生成幾何示意，非真實商家。' };
  }),
  { id: 'headquarters', name: '樂活總部', x: -10, z: -2, halfX: 5 * HEADQUARTERS_FOOTPRINT_SCALE, halfZ: 5 * HEADQUARTERS_FOOTPRINT_SCALE, height: 11, color: '#f5f4ef', description: '占地面積較原建築增加 30%；1F 為樂活現煮食團膳工廠，2F 為樂活長照集團總部辦公室。遊戲示意建築。' },
  ...servicePoints.map(service => ({ ...service, service })),
  ...[108, 122].flatMap((x, i) => [26, 43].map((z, j) => ({ id: `home-${i}-${j}`, name: '住宅社區', x, z, halfX: 4, halfZ: 4, height: 5 + j * 2, color: i ? '#e6d9c3' : '#dfc6bc', residential: true, description: '虛構一般住宅。' }))),
  ...expansionBuildings,
];
export const fountain = { x: 8, z: 0, radius: 6 };
const headquarters = buildings.find(building => building.id === 'headquarters')!;
export const chairperson = { x: headquarters.x + 1.85, y: .31, z: headquarters.z + headquarters.halfZ + .55, halfX: .6, halfZ: .3, kind: 'npc' };
export const birthdayCake = { x: headquarters.x - 2.7, z: headquarters.z + headquarters.halfZ + 1.06, halfX: .81, halfZ: .81, kind: 'birthday-cake' };
export const obstacles: Obstacle[] = [
  chairperson,
  birthdayCake,
  ...buildings.map(({ x, z, halfX, halfZ }) => ({ x, z, halfX, halfZ, kind: 'building' })),
  { x: fountain.x, z: fountain.z, halfX: fountain.radius, halfZ: fountain.radius, kind: 'fountain' },
  ...landscapeObstacles,
  { x: 43, z: 28, halfX: 1.3, halfZ: 2.5, kind: 'meal-van' },
  { x: 48, z: 28, halfX: .4, halfZ: .9, kind: 'parked-scooter' },
  { x: 39, z: 28, halfX: .35, halfZ: .35, kind: 'roadside-cone' },
];
