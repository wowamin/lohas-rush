import { CITY_LIMIT } from './roadNetwork.ts';
export const river = { x: 90, halfWidth: 5, bridgeHalfWidth: 9, bridgeCenters: [0, 260] };
export const mountains = [
  { x: -106, z: -94, radius: 14, height: 23, color: '#a6b8ac' },
  { x: -82, z: -108, radius: 12, height: 17, color: '#b7c6b2' },
];
const waterSegments: { z: number; halfZ: number }[] = [];
let start = -CITY_LIMIT;
for (const bridge of river.bridgeCenters) {
  const end = bridge - river.bridgeHalfWidth;
  waterSegments.push({ z: (start + end) / 2, halfZ: (end - start) / 2 });
  start = bridge + river.bridgeHalfWidth;
}
waterSegments.push({ z: (start + CITY_LIMIT) / 2, halfZ: (CITY_LIMIT - start) / 2 });
export const landscapeObstacles = [
  ...waterSegments.flatMap(({ z, halfZ }) => {
    return [
      { x: river.x, z, halfX: river.halfWidth, halfZ, kind: 'river' },
      ...[-1, 1].map(bank => ({ x: river.x + bank * (river.halfWidth + 0.6), z, halfX: 0.6, halfZ, kind: 'riverbank' })),
    ];
  }),
  ...river.bridgeCenters.flatMap(z => [-1, 1].map(side => ({ x: river.x, z: z + side * 8.6, halfX: 8, halfZ: 0.3, kind: 'bridge-rail' }))),
  ...mountains.map(m => ({ x: m.x, z: m.z, halfX: m.radius, halfZ: m.radius, kind: 'mountain' })),
];
