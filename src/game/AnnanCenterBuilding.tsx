import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildings } from '../data/city';
import { disposeModels } from './assets/GameAssets';
import { architecturalSurface, createSurface } from './rendering/materials';

type Surface = 'concrete' | 'wall' | 'trim' | 'glass' | 'frame' | 'roof' | 'paving' | 'green';
type Point = [number, number, number];
const annan = buildings.find(building => building.id === 'annan')!;

function createSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 300;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the An-Nan center sign texture.');

  const tiles = ['#52b9d1', '#ef87a7', '#f0ce67', '#72c7a2', '#8e9ddd', '#e8a56a'];
  const tileWidth = 128, tileHeight = 75;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 12; x++) {
      context.fillStyle = tiles[(x * 3 + y * 5 + (x * y) % 4) % tiles.length];
      context.fillRect(x * tileWidth, y * tileHeight, tileWidth - 3, tileHeight - 3);
    }
  }
  context.fillStyle = '#fffdf1e8';
  context.fillRect(22, 38, 930, 224);
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.font = '900 112px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  context.lineJoin = 'round';
  context.lineWidth = 12;
  context.strokeStyle = '#fffdf1';
  context.strokeText('樂活安南日照中心', 74, 151, 850);
  context.fillStyle = '#285a77';
  context.fillText('樂活安南日照中心', 74, 151, 850);
  context.fillStyle = '#b84078';
  context.fillRect(980, 48, 530, 204);
  context.fillStyle = '#fff8ec';
  context.textAlign = 'center';
  context.font = '700 43px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  context.fillText('臺南市立樂活安南社區長照機構', 1245, 120, 500);
  context.font = '600 30px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  context.fillText('樂齡照顧・社區共好', 1245, 182, 500);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createAnnanBuilding() {
  const root = new THREE.Group();
  const batches = new Map<Surface, THREE.BufferGeometry[]>();
  const box = (position: Point, size: Point, surface: Surface) => {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(...position);
    const batch = batches.get(surface) ?? [];
    batch.push(geometry);
    batches.set(surface, batch);
  };

  box([0, 0.18, 0], [14.2, 0.36, 11.2], 'concrete');
  box([0, 3.78, 0], [13.2, 7.2, 9.8], 'wall');
  box([0, 0.48, 0], [13.5, 0.28, 10.1], 'trim');

  const front = 4.94;
  const bays = [-5.0, -2.5, 0, 2.5, 5.0];
  for (const x of bays) {
    const width = x === 0 ? 2.16 : 2.1;
    box([x, 2.55, front + 0.07], [width + 0.22, 4.35, 0.16], 'frame');
    box([x, 2.6, front + 0.17], [width, 4.08, 0.07], 'glass');
    box([x, 2.6, front + 0.22], [0.075, 4.05, 0.06], 'trim');
    box([x, 2.6, front + 0.22], [width, 0.08, 0.06], 'trim');
    box([x, 4.05, front + 0.22], [width, 0.075, 0.06], 'trim');
    box([x, 0.88, front + 0.24], [width - 0.16, 1.18, 0.035], 'trim');
  }
  box([0, 0.67, front + 0.29], [1.32, 1.1, 0.08], 'frame');
  box([0, 0.67, front + 0.35], [1.12, 0.94, 0.04], 'glass');

  box([0, 5.02, front + 0.05], [13.45, 0.22, 0.24], 'trim');
  box([0, 5.34, front + 0.38], [13.9, 0.38, 1.55], 'roof');
  box([-6.2, 4.9, 5.0], [0.18, 0.68, 0.18], 'frame');
  box([6.2, 4.9, 5.0], [0.18, 0.68, 0.18], 'frame');

  box([0, 7.85, 0], [13.55, 2.25, 10.0], 'wall');
  box([0, 8.16, front + 0.14], [13.2, 2.42, 0.18], 'frame');
  box([0, 8.16, front + 0.25], [12.95, 2.18, 0.06], 'trim');

  box([0, 9.03, 0], [13.9, 0.18, 10.2], 'roof');
  box([0, 9.15, 0], [13.5, 0.09, 9.9], 'trim');

  box([0, 0.09, 8.55], [5.0, 0.18, 7.0], 'paving');
  for (const x of [-4.7, 4.7]) {
    box([x, 0.24, 6.1], [2.4, 0.42, 2.0], 'concrete');
    for (let i = 0; i < 5; i++) {
      const shrub = new THREE.IcosahedronGeometry(0.5, 0);
      shrub.translate(x + (i - 2) * 0.32, 0.62, 6.1 + (i % 2) * 0.16);
      const batch = batches.get('green') ?? [];
      batch.push(shrub);
      batches.set('green', batch);
    }
  }
  for (const x of [-2.5, 2.5]) {
    box([x, 0.42, 8.3], [1.55, 0.72, 0.5], 'trim');
    box([x, 0.82, 8.3], [1.62, 0.12, 0.58], 'frame');
  }

  const colors: Record<Surface, string> = {
    concrete: '#c7c5bd',
    wall: '#e9e7df',
    trim: '#f2eee3',
    glass: '#d2b88e',
    frame: '#293d4b',
    roof: '#53646c',
    paving: '#c9b8a2',
    green: '#739551',
  };
  for (const [surface, geometries] of batches) {
    const geometry = mergeGeometries(geometries);
    geometries.forEach(item => item.dispose());
    const mesh = new THREE.Mesh(geometry, createSurface(architecturalSurface(surface),{color:colors[surface]}));
    mesh.name = `annan-center-${surface}`;
    mesh.castShadow = surface!=='glass';
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(12.4, 2.12),
    new THREE.MeshStandardMaterial({ map: createSignTexture(), roughness: 0.8, side: THREE.DoubleSide }),
  );
  sign.name = 'annan-center-sign';
  sign.position.set(0, 8.16, front + 0.3);
  root.add(sign);
  return root;
}

export function AnnanCenterBuilding() {
  const host = useRef<THREE.Group>(null);
  useEffect(() => {
    const container = host.current!;
    const model = createAnnanBuilding();
    container.add(model);
    return () => {
      container.remove(model);
      disposeModels([model]);
    };
  }, []);

  return (
    <group
      ref={host}
      name="annan-center-building"
      position={[annan.x, 0, annan.z]}
      rotation={[0, annan.rotation ?? 0, 0]}
    />
  );
}
