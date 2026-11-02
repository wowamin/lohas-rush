import { locations } from '../../data/city.ts';
export function hasArrived(x: number, z: number, index: number) {
  const destination = locations[index];
  return !!destination && Math.hypot(x - destination.arrival[0], z - destination.arrival[1]) <= destination.radius;
}
