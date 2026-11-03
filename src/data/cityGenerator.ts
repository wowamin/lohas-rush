import type { Point } from './roadNetwork.ts';

export type SpawnPoint = {
  id: string; position: [number, number, number]; rotation: number; arrival: Point; roadNode: string; district?: string;
};
type Options = {
  spawnPoints: readonly SpawnPoint[]; normalShops: readonly string[]; sunCareCenters: readonly string[]; seed: number;
  minShopGap?: number; minCenterDistance?: number; centerDistricts?: readonly string[];
};
export function generateCity({ spawnPoints, normalShops, sunCareCenters, seed, minShopGap = 8, minCenterDistance = 220, centerDistricts }: Options) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('City seed must be an unsigned 32-bit integer.');
  if (new Set(spawnPoints.map(point => point.id)).size !== spawnPoints.length ||
      new Set(spawnPoints.map(point => point.position.join(','))).size !== spawnPoints.length) {
    throw new Error('Building lots must have unique IDs and positions.');
  }
  if (new Set(sunCareCenters).size !== sunCareCenters.length) throw new Error('Care center IDs must be unique.');
  if (spawnPoints.length < sunCareCenters.length) throw new Error('Not enough building lots to place every care center.');
  if (!Number.isInteger(minShopGap) || minShopGap < 0 || !Number.isFinite(minCenterDistance) || minCenterDistance < 0) throw new Error('Invalid care center spacing settings.');
  if (centerDistricts && (centerDistricts.length !== sunCareCenters.length || new Set(centerDistricts).size !== centerDistricts.length)) throw new Error('Each care center must have a distinct required district.');
  if (sunCareCenters.length && minShopGap && !normalShops.length) throw new Error('Shop prefabs are required to satisfy the minimum shop gap.');
  if (spawnPoints.length < sunCareCenters.length * (minShopGap + 1)) throw new Error('Not enough building lots for the required shop gap.');
  let state = seed;
  const randomIndex = (length: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor(state / 0x100000000 * length);
  };
  // Seeded candidate order, then bounded backtracking: probability never decides whether
  // one of the five required centers is omitted. Keep source order for real shop gaps.
  const candidates = sunCareCenters.map((_, center) => {
    const indices = spawnPoints.flatMap((point, index) => !centerDistricts || point.district === centerDistricts[center] ? [index] : []);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1); [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  });
  const selected: number[] = [];
  let attempts = 0;
  const search = (center: number): boolean => {
    if (center === sunCareCenters.length) return true;
    const firstAllowed = (selected[center - 1] ?? -1) + minShopGap + 1;
    for (const index of candidates[center]) {
      if (++attempts > 100000) return false;
      if (index < firstAllowed || index + (sunCareCenters.length - center - 1) * (minShopGap + 1) >= spawnPoints.length) continue;
      const point = spawnPoints[index];
      if (selected.some(previous => {
        const other = spawnPoints[previous];
        return Math.hypot(point.position[0] - other.position[0], point.position[2] - other.position[2]) < minCenterDistance ||
          Math.hypot(point.arrival[0] - other.arrival[0], point.arrival[1] - other.arrival[1]) < minCenterDistance;
      })) continue;
      selected.push(index);
      if (search(center + 1)) return true;
      selected.pop();
    }
    return false;
  };
  if (!search(0)) throw new Error('Unable to place every care center with the required distance, shop gap and district constraints.');
  const occupied = new Set(selected);
  const centers = sunCareCenters.map((prefab, index) => ({ prefab, point: spawnPoints[selected[index]] }));
  const availablePoints = spawnPoints.filter((_, index) => !occupied.has(index));
  const shops = normalShops.length ? availablePoints.map(point => ({ prefab: normalShops[randomIndex(normalShops.length)], point })) : [];
  return { centers, shops, unfilledLots: normalShops.length ? [] : availablePoints };
}
