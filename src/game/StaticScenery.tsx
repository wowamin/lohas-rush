import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildings, streetFurniture } from '../data/city';
import { SIDEWALK_WIDTH } from '../data/streetFurniture';
import { roads, nodeById, CITY_LIMIT, INNER_RADIUS, OUTER_RADIUS, cityBlocks, streetJunctions } from '../data/roadNetwork';
import { river, landscapeObstacles } from '../data/landscape';
import { createSurface, type Surface } from './rendering/materials';
import { Vegetation } from './rendering/Vegetation';

type Instance = { position: [number, number, number]; size: [number, number, number]; color: string; rotation?: number; owner?: string };
const boxes: Instance[] = [];
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
    box([x, 0, z], [road.width + SIDEWALK_WIDTH*2, 0.1, meshLength], '#e4dfcf', rotation);
    box([x, 0.065, z], [road.width, 0.08, meshLength], '#7f9292', rotation);
    const dx=Math.cos(rotation)*(road.width/2+.12),dz=-Math.sin(rotation)*(road.width/2+.12);
    for(const side of [-1,1])box([x+side*dx,.105,z+side*dz],[.22,.12,meshLength],'#e4dfcf',rotation);
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
  box([x, 0.04, z], [12.2+SIDEWALK_WIDTH*2, 0.04, 12.2+SIDEWALK_WIDTH*2], '#e4dfcf');
  box([x, 0.12, z], [12.1, 0.04, 12.1], '#7f9292');
}
for (const block of cityBlocks) {
  box([block.center[0], -0.01, block.center[1]], [block.lotWidth, 0.06, block.lotDepth], block.district === 'west' ? '#c8d4b7' : '#d5d9bd');
}
buildings.forEach(b => {
  if (b.id === 'daihe' || b.id === 'annan' || b.id === 'xinying') return;
  const rotation = b.rotation ?? 0, sin = Math.sin(rotation), cos = Math.cos(rotation);
  let owner: string | undefined;
  const add = (position: Instance['position'], size: Instance['size'], color: string) =>
    box([b.x + position[0] * cos + position[2] * sin, position[1], b.z + position[2] * cos - position[0] * sin], size, color, rotation, owner);
  add([0, 0.16, 0], [b.halfX * 2 + 2, 0.3, b.halfZ * 2 + 2], '#e4dfcf');
  owner = b.shop ? b.id : undefined;
  if (b.id !== 'headquarters') {
    const facade=new THREE.Color(b.color).lerp(new THREE.Color('#ecebe6'),b.shop?.55:.75).getStyle();
    add([0, b.height / 2 + 0.3, 0], [b.halfX * 2, b.height, b.halfZ * 2], facade);
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
});
streetFurniture.forEach((fixture)=>{
  const {x,z,rotation}=fixture;
  if(fixture.kind==='tree'){
    // Raised crowns clear the van; planted pits stay inside the curb strip.
    box([x,.12,z],[1.35,.12,1.35],'#aebf92',rotation);
  }else{
    const cos=Math.cos(rotation),sin=Math.sin(rotation);
    box([x,.19,z],[.38,.24,.38],'#65746f',rotation);
    box([x,3.07,z],[.16,5.9,.16],'#576d72',rotation);
    box([x+.65*cos,6.03,z-.65*sin],[1.45,.14,.18],'#576d72',rotation);
    box([x+1.25*cos,5.94,z-1.25*sin],[.65,.16,.43],'#fff1bc',rotation);
  }
});
const emptyShops: ReadonlySet<string> = new Set();
function classify(color: string): Surface {
  if(color==='#7f9292')return 'asphalt';
  if(color==='#e4dfcf')return 'tile';
  if(['#75989a','#78999b'].includes(color))return 'glass';
  if(['#b6cda4','#c8d4b7','#d5d9bd','#aebf92'].includes(color))return 'grass';
  if(['#65746f','#576d72'].includes(color))return 'metal';
  if(color==='#8ebcc8')return 'water';
  if(color==='#eee9ce')return 'marking';
  return 'plaster';
}
const surfaceBatches = new Map<Surface,Instance[]>();
for(const item of boxes){const surface=classify(item.color),batch=surfaceBatches.get(surface)??[];batch.push(item);surfaceBatches.set(surface,batch);}
function Instances({ items, surface, hiddenShops = emptyShops }: { items: Instance[]; surface: Surface; hiddenShops?: ReadonlySet<string> }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  // InstancedMesh supplies instanceColor automatically. BoxGeometry has no
  // per-vertex color attribute, so enabling vertexColors would multiply by zero.
  const material=useMemo(()=>createSurface(surface),[surface]);
  useEffect(()=>()=>{material.map?.dispose();material.normalMap?.dispose();material.roughnessMap?.dispose();material.dispose();},[material]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const object = new THREE.Object3D();
    const color = new THREE.Color();
    let index = 0;
    items.forEach(item => {
      if (item.owner && hiddenShops.has(item.owner)) return;
      object.position.set(...item.position); object.scale.set(...item.size); object.rotation.set(0, item.rotation ?? 0, 0); object.updateMatrix();
      mesh.current!.setMatrixAt(index, object.matrix);
      mesh.current!.setColorAt(index, color.set(['asphalt','tile','grass'].includes(surface)?'#ffffff':item.color));
      index++;
    });
    mesh.current.count = index;
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [items, hiddenShops, surface]);
  return <instancedMesh name={`city-surface-${surface}`} ref={mesh} args={[undefined, undefined, items.length]} castShadow={!['glass','grass','asphalt','marking','water','tile'].includes(surface)} receiveShadow>
    <boxGeometry />
    <primitive object={material} attach="material" />
  </instancedMesh>;
}

// Batch by PBR surface; object count does not multiply draw calls.
export const StaticScenery = memo(function StaticScenery({ hiddenShops }: { hiddenShops: ReadonlySet<string> }) {
  const roadMaterial=useMemo(()=>createSurface('asphalt'),[]),pavingMaterial=useMemo(()=>createSurface('tile',{color:'#e3dfd3'}),[]);
  useEffect(()=>()=>{for(const material of [roadMaterial,pavingMaterial]){material.map?.dispose();material.normalMap?.dispose();material.roughnessMap?.dispose();material.dispose();}},[roadMaterial,pavingMaterial]);
  return <>{Array.from(surfaceBatches,([surface,items])=><Instances key={surface} items={items} surface={surface} hiddenShops={hiddenShops} />)}<Vegetation />
    {[INNER_RADIUS, OUTER_RADIUS].map(radius => <group key={radius}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow><ringGeometry args={[radius - 8-SIDEWALK_WIDTH, radius + 8+SIDEWALK_WIDTH, 128]} /><primitive object={pavingMaterial} attach="material" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]} receiveShadow><ringGeometry args={[radius - 8, radius + 8, 128]} /><primitive object={roadMaterial} attach="material" /></mesh>
      {[-8,8].map(offset=><mesh key={offset} rotation={[-Math.PI/2,0,0]} position={[0,.09,0]} receiveShadow><torusGeometry args={[radius+offset,.065,4,128]} /><meshStandardMaterial color="#d8d4c8" roughness={.85} /></mesh>)}
    </group>)}
  </>;
});
