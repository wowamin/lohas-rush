import { streetNodes, streetRoads } from './streetGrid.ts';
export { cityBlocks, streetDistricts } from './streetGrid.ts';
export type Point = [number, number];
export type RoadNode = { id: string; point: Point };
export type Road = { from: string; to: string; width: number; kind: 'ring' | 'radial' | 'bridge' | 'access' | 'street' };
export const CITY_LIMIT = 448;
export const RING_SEGMENTS = 40;
export const INNER_RADIUS = 32;
export const OUTER_RADIUS = 64;
export const CENTER_INDICES = [20, 28, 36, 4, 12];
export const SPAWN = { x: 0, z: INNER_RADIUS, angle: 0, speed: 0 };
export const polar = (radius: number, index: number): Point => [Math.sin(index / RING_SEGMENTS * Math.PI * 2) * radius, Math.cos(index / RING_SEGMENTS * Math.PI * 2) * radius];
export const roadNodes: RoadNode[] = [INNER_RADIUS, OUTER_RADIUS].flatMap((radius, ring) => Array.from({ length: RING_SEGMENTS }, (_, index) => ({ id: `${ring}-${index}`, point: polar(radius, index) })));
export const roads: Road[] = [0, 1].flatMap(ring => Array.from({ length: RING_SEGMENTS }, (_, i) => ({ from: `${ring}-${i}`, to: `${ring}-${(i + 1) % RING_SEGMENTS}`, width: 16, kind: 'ring' as const })));
for (const i of CENTER_INDICES) roads.push({ from: `0-${i}`, to: `1-${i}`, width: 16, kind: 'radial' });
roadNodes.push(
  { id: 'bridge-west', point: [80, 0] }, { id: 'bridge-east', point: [100, 0] },
  { id: 'community', point: [110, 0] }, { id: 'hospital', point: [110, -12] },
  { id: 'neighborhood', point: [110, 12] }, { id: 'neighborhood-east', point: [122, 12] },
);
roads.push(
  { from: '1-10', to: 'bridge-west', width: 16, kind: 'access' },
  { from: 'bridge-west', to: 'bridge-east', width: 16, kind: 'bridge' },
  { from: 'bridge-east', to: 'community', width: 16, kind: 'access' },
  { from: 'community', to: 'hospital', width: 16, kind: 'access' },
  { from: 'community', to: 'neighborhood', width: 12, kind: 'access' },
  { from: 'neighborhood', to: 'neighborhood-east', width: 12, kind: 'access' },
);
roadNodes.push(...streetNodes);
roads.push(...streetRoads);
export const nodeById = new Map(roadNodes.map(node => [node.id, node]));
const nodeOrder = new Map(roadNodes.map((node, index) => [node.id, index]));
const adjacent = new Map(roadNodes.map(node => [node.id, [] as { id: string; distance: number }[]]));
for (const road of roads) {
  const a = nodeById.get(road.from)!.point, b = nodeById.get(road.to)!.point;
  const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
  adjacent.get(road.from)!.push({ id: road.to, distance }); adjacent.get(road.to)!.push({ id: road.from, distance });
}
export const streetJunctions = streetNodes.flatMap(node => {
  const connected = roads.filter(road => road.from === node.id || road.to === node.id);
  if (connected.length < 2) return [];
  let kind: 'cross' | 'tee' | 'corner' | 'straight' = connected.length >= 4 ? 'cross' : connected.length === 3 ? 'tee' : 'straight';
  if (connected.length === 2) {
    const a = nodeById.get(connected[0].from === node.id ? connected[0].to : connected[0].from)!.point;
    const b = nodeById.get(connected[1].from === node.id ? connected[1].to : connected[1].from)!.point;
    if (Math.abs((a[0] - node.point[0]) * (b[1] - node.point[1]) - (a[1] - node.point[1]) * (b[0] - node.point[0])) > 0.01) kind = 'corner';
  }
  return [{ ...node, kind }];
});
export function nearestRoadNode(x: number, z: number) {
  let nearest = roadNodes[0], distance = Infinity;
  for (const node of roadNodes) {
    const d = Math.hypot(x - node.point[0], z - node.point[1]);
    if (d < distance) { nearest = node; distance = d; }
  }
  return nearest.id;
}
// Guidance follows declared streets rather than cutting across city blocks.
export function findRoadRoute(start: string, destination: string): Point[] {
  if (!nodeById.has(start) || !nodeById.has(destination)) return [];
  const distances = new Map([[start, 0]]);
  const previous = new Map<string, string>();
  type Entry = { id: string; distance: number };
  const heap: Entry[] = [];
  const before = (a: Entry, b: Entry) => a.distance < b.distance || a.distance === b.distance && nodeOrder.get(a.id)! < nodeOrder.get(b.id)!;
  const push = (entry: Entry) => {
    heap.push(entry); let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!before(heap[i], heap[parent])) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]]; i = parent;
    }
  };
  const pop = () => {
    const first = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last; let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && before(heap[child + 1], heap[child])) child++;
        if (!before(heap[child], heap[i])) break;
        [heap[i], heap[child]] = [heap[child], heap[i]]; i = child;
      }
    }
    return first;
  };
  push({ id: start, distance: 0 });
  while (heap.length) {
    const current = pop();
    if (current.distance !== distances.get(current.id)) continue;
    if (current.id === destination) break;
    for (const next of adjacent.get(current.id)!) {
      const distance = current.distance + next.distance;
      if (distance < (distances.get(next.id) ?? Infinity)) {
        distances.set(next.id, distance); previous.set(next.id, current.id); push({ id: next.id, distance });
      }
    }
  }
  if (!distances.has(destination)) return [];
  const route: Point[] = [];
  for (let id: string | undefined = destination; id; id = previous.get(id)) {
    const node = nodeById.get(id);
    if (!node) return [];
    route.unshift(node.point);
    if (id === start) return route;
  }
  return [];
}
