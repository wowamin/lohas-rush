import type { Point, Road, RoadNode } from './roadNetwork.ts';
import type { SpawnPoint } from './cityGenerator.ts';

export type CityBlock = { id: string; district: string; center: Point; width: number; depth: number; lotWidth: number; lotDepth: number; lot: SpawnPoint };
export const centerDistrictIds = ['northwest', 'southwest', 'far-south', 'southeast', 'northeast'];
export const streetDistricts = [
  { id: 'west', name: '西側街坊', xs: [-148, -116, -84], zs: [-64, -32, 0, 32, 64], exit: '1-30', entry: 'west-2-2' },
  { id: 'south', name: '南側街坊', xs: [-64, -32, 0, 32, 64], zs: [84, 116, 148], exit: '1-0', entry: 'south-2-0' },
  { id: 'northwest', name: '西北街區', xs: [-372, -340, -308, -276, -244], zs: [-292, -260, -228, -196, -164], exit: 'artery-west-top', entry: 'northwest-4-4' },
  { id: 'southwest', name: '西南街區', xs: [-372, -340, -308, -276, -244], zs: [132, 164, 196, 228, 260], exit: 'artery-west-south', entry: 'southwest-4-0' },
  { id: 'far-south', name: '南城街區', xs: [-64, -32, 0, 32, 64], zs: [292, 324, 356, 388, 420], exit: 'artery-south', entry: 'far-south-2-0' },
  { id: 'southeast', name: '東南街區', xs: [244, 276, 308, 340, 372], zs: [132, 164, 196, 228, 260], exit: 'artery-east-south', entry: 'southeast-0-0' },
  { id: 'northeast', name: '東北街區', xs: [244, 276, 308, 340, 372], zs: [-292, -260, -228, -196, -164], exit: 'artery-east-top', entry: 'northeast-0-4' },
];
export const streetNodes: RoadNode[] = [];
export const streetRoads: Road[] = [];
export const cityBlocks: CityBlock[] = [];
for (const district of streetDistricts) {
  const { id, xs, zs } = district;
  for (let row = 0; row < zs.length; row++) for (let col = 0; col < xs.length; col++) {
    const node = `${id}-${col}-${row}`;
    streetNodes.push({ id: node, point: [xs[col], zs[row]] });
    if (row > 0) streetRoads.push({ from: `${id}-${col}-${row - 1}`, to: node, width: 12, kind: 'street' });
    if (col === xs.length - 1) continue;
    const midpoint = `${id}-front-${col}-${row}`;
    const x = (xs[col] + xs[col + 1]) / 2;
    streetNodes.push({ id: midpoint, point: [x, zs[row]] });
    streetRoads.push(
      { from: node, to: midpoint, width: 12, kind: 'street' },
      { from: midpoint, to: `${id}-${col + 1}-${row}`, width: 12, kind: 'street' },
    );
    if (row === zs.length - 1) continue;
    const z = (zs[row] + zs[row + 1]) / 2;
    const blockId = `${id}-block-${col}-${row}`;
    cityBlocks.push({ id: blockId, district: id, center: [x, z], width: xs[col + 1] - xs[col], depth: zs[row + 1] - zs[row], lotWidth: 16, lotDepth: 16,
      lot: { id: `${blockId}-lot`, position: [x, 0, z], rotation: Math.PI, arrival: [x, zs[row]], roadNode: midpoint, district: id } });
  }
  streetRoads.push({ from: district.exit, to: district.entry, width: 12, kind: 'street' });
}
// Arterial intersections are explicit nodes, so no visual crossing is a graph dead end.
const westSpine: [string, Point][] = [
  ['artery-west-top', [-212, -164]], ['artery-west-upper', [-212, -64]], ['artery-west-mid', [-212, 0]],
  ['artery-west-lower', [-212, 64]], ['artery-west-south', [-212, 132]], ['artery-west-bottom', [-212, 260]],
];
const eastSpine: [string, Point][] = [
  ['artery-east-top', [180, -164]], ['artery-east-mid', [180, 0]], ['artery-east-south', [180, 132]], ['artery-east-bottom', [180, 260]],
];
for (const spine of [westSpine, eastSpine]) {
  spine.forEach(([id, point]) => streetNodes.push({ id, point }));
  for (let i = 1; i < spine.length; i++) streetRoads.push({ from: spine[i - 1][0], to: spine[i][0], width: 12, kind: 'street' });
}
streetNodes.push({ id: 'artery-south', point: [0, 260] }, { id: 'south-bridge-west', point: [80, 260] }, { id: 'south-bridge-east', point: [100, 260] });
for (const [from, to] of [
  ['west-0-0', 'artery-west-upper'], ['west-0-2', 'artery-west-mid'], ['west-0-4', 'artery-west-lower'],
  ['south-2-2', 'artery-south'], ['community', 'artery-east-mid'],
  ['southwest-4-4', 'artery-west-bottom'], ['artery-west-bottom', 'artery-south'],
  ['artery-south', 'south-bridge-west'], ['south-bridge-east', 'artery-east-bottom'], ['artery-east-bottom', 'southeast-0-4'],
]) streetRoads.push({ from, to, width: 12, kind: 'street' });
streetRoads.push({ from: 'south-bridge-west', to: 'south-bridge-east', width: 16, kind: 'bridge' });
