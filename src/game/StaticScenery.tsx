import { memo, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildings } from '../data/city';
import { roads, nodeById, CITY_LIMIT, INNER_RADIUS, OUTER_RADIUS, cityBlocks, streetJunctions } from '../data/roadNetwork';
import { river, landscapeObstacles } from '../data/landscape';

type Instance = { position: [number, number, number]; size: [number, number, number]; color: string; rotation?: number; owner?: string };
const boxes: Instance[] = [];
const trunks: Instance[] = [];
const leaves: Instance[] = [];
function box(position: Instance['position'], size: Instance['size'], color: string, rotation = 0, owner?: string) {
  boxes.push({ position, size, color, rotation, owner });
}
box([0, -0.2, 0], [CITY_LIMIT * 2, 0.3, CITY_LIMIT * 2], '#b6cda4');
box([river.x, -0.02, 0], [river.halfWidth * 2, 0.08, CITY_LIMIT * 2], '#8ebcc8');
for (const obstacle of landscapeObstacles) {
  if (obstacle.kind !== 'riverbank' && obstacle.kind !== 'bridge-rail') continue;
  const height = obstacle.kind === 'bridge-rail' ? 1.1 : 0.7;
  box([obstacle.x, height / 2 + 0.1, obstacle.z], [obstacle.halfX * 2, height, obstacle.halfZ * 2], '#d8d5bf');
}
for (const road of roads) {
  const a = nodeById.get(road.from)!.point, b = nodeById.get(road.to)!.point;
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const rotation = Math.atan2(b[0] - a[0], b[1] - a[1]);
  const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
  if (road.kind !== 'ring') {
    const meshLength = length + (road.kind === 'street' ? 0 : 1);
    box([x, 0, z], [road.width + 4, 0.1, meshLength], '#e4dfcf', rotation);
    box([x, 0.065, z], [road.width, 0.08, meshLength], '#7f9292', rotation);
  }
  for (let distance = road.kind === 'street' ? 7 : 2; distance < length - (road.kind === 'street' ? 6 : 1); distance += 5) {
    const t = distance / length;
    box([a[0] + (b[0] - a[0]) * t, 0.12, a[1] + (b[1] - a[1]) * t], [0.16, 0.015, 2], '#eee9ce', rotation);
  }
}
for (const junction of streetJunctions) {
  if (junction.kind === 'straight') continue;
  const [x, z] = junction.point;
  // Raised intersection tiles cover coplanar street overlaps at T/cross/corner joins.
  box([x, 0.04, z], [16.2, 0.04, 16.2], '#e4dfcf');
  box([x, 0.12, z], [12.1, 0.04, 12.1], '#7f9292');
}
for (const block of cityBlocks) {
  box([block.center[0], -0.01, block.center[1]], [block.lotWidth, 0.06, block.lotDepth], block.district === 'west' ? '#c8d4b7' : '#d5d9bd');
}
buildings.forEach((b, index) => {
  if (b.id === 'daihe' || b.id === 'annan' || b.id === 'xinying') return;
  const rotation = b.rotation ?? 0, sin = Math.sin(rotation), cos = Math.cos(rotation);
  let owner: string | undefined;
  const add = (position: Instance['position'], size: Instance['size'], color: string) =>
    box([b.x + position[0] * cos + position[2] * sin, position[1], b.z + position[2] * cos - position[0] * sin], size, color, rotation, owner);
  add([0, 0.16, 0], [b.halfX * 2 + 2, 0.3, b.halfZ * 2 + 2], '#e4dfcf');
  owner = b.shop ? b.id : undefined;
  if (b.id !== 'headquarters') {
    add([0, b.height / 2 + 0.3, 0], [b.halfX * 2, b.height, b.halfZ * 2], b.color);
    add([0, b.height + 0.45, 0], [b.halfX * 2 + 0.5, 0.35, b.halfZ * 2 + 0.5], '#fcf4e2');
    for (const x of [-0.55, 0, 0.55]) {
      for (let y = 3; y < b.height; y += 3) add([x * b.halfX, y, b.halfZ + 0.03], [Math.min(1.6, b.halfX * 0.45), 1.5, 0.08], '#75989a');
    }
  }
  if (b.shop) {
    add([0, 1.4, b.halfZ + 0.05], [1.4, 2.2, 0.1], '#78999b');
    add([0, 2.9, b.halfZ + 0.6], [b.halfX * 2 + 0.4, 0.3, 1.6], '#fff4dd');
    for (const stripe of [-1, 1]) add([stripe * 2.5, 2.9, b.halfZ + 0.6], [1.3, 0.34, 1.65], b.color);
  }
  owner = undefined;
  const treeZ = b.z + (index % 2 ? 7 : -7);
  trunks.push({ position: [b.x - 8, 1, treeZ], size: [1, 1, 1], color: '#a08b6e' });
  leaves.push({ position: [b.x - 8, 3.3, treeZ], size: [1, 1, 1], color: index % 2 ? '#86b195' : '#a4bd88' });
  add([8, 2.7, -7], [0.16, 5.4, 0.16], '#667b76');
  add([7.5, 5.4, -7], [1.2, 0.15, 0.2], '#667b76');
  add([7.1, 5.25, -7], [0.6, 0.2, 0.5], '#fff1bc');
});
const emptyShops: ReadonlySet<string> = new Set();
function Instances({ items, shape, hiddenShops = emptyShops }: { items: Instance[]; shape: 'box' | 'trunk' | 'leaf'; hiddenShops?: ReadonlySet<string> }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const object = new THREE.Object3D();
    const color = new THREE.Color();
    let index = 0;
    items.forEach(item => {
      if (item.owner && hiddenShops.has(item.owner)) return;
      object.position.set(...item.position); object.scale.set(...item.size); object.rotation.set(0, item.rotation ?? 0, 0); object.updateMatrix();
      mesh.current!.setMatrixAt(index, object.matrix);
      mesh.current!.setColorAt(index, color.set(item.color));
      index++;
    });
    mesh.current.count = index;
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [items, hiddenShops]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} castShadow receiveShadow>
    {shape === 'box' ? <boxGeometry /> : shape === 'trunk' ? <cylinderGeometry args={[0.25, 0.35, 2, 6]} /> : <icosahedronGeometry args={[1.8, 0]} />}
    <meshStandardMaterial roughness={0.9} />
  </instancedMesh>;
}

// Static city geometry uses three batches instead of a draw call for each object.
export const StaticScenery = memo(function StaticScenery({ hiddenShops }: { hiddenShops: ReadonlySet<string> }) {
  return <><Instances items={boxes} shape="box" hiddenShops={hiddenShops} /><Instances items={trunks} shape="trunk" /><Instances items={leaves} shape="leaf" />
    {[INNER_RADIUS, OUTER_RADIUS].map(radius => <group key={radius}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow><ringGeometry args={[radius - 10, radius + 10, 80]} /><meshStandardMaterial color="#e4dfcf" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]} receiveShadow><ringGeometry args={[radius - 8, radius + 8, 80]} /><meshStandardMaterial color="#7f9292" /></mesh>
    </group>)}
  </>;
});
