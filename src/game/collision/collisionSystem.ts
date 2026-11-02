import { CITY_LIMIT, obstacles, type Obstacle } from '../../data/city.ts';
// Conservative enclosing circle, valid at every car heading.
export const CAR_RADIUS = 2.45;
export function collides(x: number, z: number, blockers: Obstacle[] = obstacles) {
  return Math.abs(x) + CAR_RADIUS > CITY_LIMIT || Math.abs(z) + CAR_RADIUS > CITY_LIMIT ||
    blockers.some(o => Math.abs(x - o.x) < o.halfX + CAR_RADIUS && Math.abs(z - o.z) < o.halfZ + CAR_RADIUS);
}
