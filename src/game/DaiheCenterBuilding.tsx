import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildings } from '../data/city';
import { disposeModels } from './assets/GameAssets';

type Surface = 'concrete' | 'wall' | 'trim' | 'glass' | 'louver' | 'steel' | 'canopy' | 'paving' | 'green';
type Point = [number, number, number];
const daihe = buildings.find(building => building.id === 'daihe')!;

function createDaiheBuilding() {
  const root = new THREE.Group();
  const batches = new Map<Surface, THREE.BufferGeometry[]>();
  const box = (position: Point, size: Point, surface: Surface) => {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(...position);
    const batch = batches.get(surface) ?? [];
    batch.push(geometry);
    batches.set(surface, batch);
  };

  box([0, 0.2, 0], [13.4, 0.4, 10.4], 'concrete');
  box([0, 5.55, 0], [12.6, 10.3, 9.6], 'wall');
  box([0, 0.62, 0], [12.8, 0.35, 9.8], 'trim');

  const front = 4.84;
  for (const y of [4.1, 7.35]) {
    box([-3.45, y, front + 0.07], [4.4, 2.7, 0.12], 'trim');
    box([-3.45, y, front + 0.15], [4.08, 2.38, 0.08], 'wall');
  }
  box([-0.25, 5.62, front + 0.09], [2.4, 1.15, 0.16], 'trim');
  box([-0.25, 5.62, front + 0.19], [2.15, 0.9, 0.08], 'glass');

  box([0.75, 1.9, front + 0.08], [3.15, 2.75, 0.18], 'trim');
  box([0.75, 1.9, front + 0.19], [2.84, 2.43, 0.08], 'glass');
  box([0.75, 1.9, front + 0.25], [0.07, 2.4, 0.07], 'steel');
  box([0.75, 1.9, front + 0.25], [2.8, 0.07, 0.07], 'steel');
  box([0.75, 1.9, front + 0.3], [0.045, 2.35, 0.035], 'steel');

  const screenX = 1.95, screenY = 8.55, screenWidth = 5.45, screenHeight = 2.35;
  box([screenX, screenY, front + 0.1], [screenWidth, screenHeight, 0.12], 'steel');
  for (let i = 0; i < 13; i++) {
    const y = screenY - screenHeight / 2 + 0.12 + i * 0.175;
    box([screenX, y, front + 0.2], [screenWidth + 0.08, 0.085, 0.14], 'louver');
  }
  for (const x of [screenX - screenWidth / 2, screenX + screenWidth / 2]) {
    box([x, screenY, front + 0.28], [0.11, screenHeight + 0.12, 0.12], 'steel');
  }
  box([screenX, 7.12, front + 0.12], [screenWidth + 0.2, 0.16, 0.24], 'trim');

  for (const y of [3.35, 6.72, 10.0]) {
    box([0, y, front + 0.06], [12.6, 0.22, 0.2], 'trim');
  }

  const signX = 6.08;
  box([signX, 5.8, front + 0.15], [0.52, 5.7, 0.16], 'trim');
  for (let i = 0; i < 3; i++) {
    box([signX, 7.55 - i * 1.65, front + 0.26], [0.16, 0.16, 0.05], 'louver');
  }

  for (const x of [-5.7, 0, 5.7]) {
    box([x, 11.1, 0], [0.16, 1.3, 0.16], 'steel');
    box([x, 11.1, 3.8], [0.16, 1.3, 0.16], 'steel');
    box([x, 11.1, -3.8], [0.16, 1.3, 0.16], 'steel');
  }
  box([0, 11.82, 0], [12.7, 0.16, 8.6], 'steel');
  for (const [x, width] of [[-3.15, 6.1], [3.15, 6.1]] as const) {
    box([x, 12.02, 0], [width, 0.18, 8.35], 'canopy');
    for (let z = -3.7; z <= 3.71; z += 0.55) {
      box([x, 12.13, z], [width - 0.12, 0.035, 0.045], 'steel');
    }
  }

  box([0, 0.09, 9.15], [3.6, 0.18, 8.0], 'paving');
  for (const x of [-4.7, 4.7]) {
    box([x, 0.25, 6.2], [2.3, 0.5, 2.2], 'concrete');
    for (let i = 0; i < 5; i++) {
      const shrub = new THREE.IcosahedronGeometry(0.55, 0);
      shrub.translate(x + (i - 2) * 0.34, 0.75, 6.2 + (i % 2) * 0.22);
      const batch = batches.get('green') ?? [];
      batch.push(shrub);
      batches.set('green', batch);
    }
  }
  for (const x of [-2.7, 2.7]) {
    box([x, 0.42, 8.7], [1.65, 0.72, 0.55], 'trim');
    box([x, 0.82, 8.7], [1.72, 0.12, 0.62], 'steel');
  }

  const colors: Record<Surface, string> = {
    concrete: '#c9c9c6',
    wall: '#e9e9e5',
    trim: '#f5f4ef',
    glass: '#344956',
    louver: '#493b38',
    steel: '#667681',
    canopy: '#aeb8bc',
    paving: '#c9c4b8',
    green: '#72935b',
  };
  for (const [surface, geometries] of batches) {
    const geometry = mergeGeometries(geometries);
    geometries.forEach(item => item.dispose());
    const material = new THREE.MeshStandardMaterial({
      color: colors[surface],
      roughness: surface === 'glass' ? 0.3 : 0.85,
      metalness: surface === 'steel' || surface === 'canopy' ? 0.35 : 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `daihe-center-${surface}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}

export function DaiheCenterBuilding() {
  const host = useRef<THREE.Group>(null);
  useEffect(() => {
    const container = host.current!;
    const model = createDaiheBuilding();
    container.add(model);
    return () => {
      container.remove(model);
      disposeModels([model]);
    };
  }, []);

  return (
    <group
      ref={host}
      name="daihe-center-building"
      position={[daihe.x, 0, daihe.z]}
      rotation={[0, daihe.rotation ?? 0, 0]}
    />
  );
}
