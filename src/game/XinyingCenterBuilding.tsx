import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildings } from '../data/city';
import { disposeModels } from './assets/GameAssets';

type Surface = 'concrete' | 'wall' | 'trim' | 'glass' | 'frame' | 'mesh' | 'sign' | 'roof' | 'paving' | 'green';
type Point = [number, number, number];
const xinying = buildings.find(building => building.id === 'xinying')!;

function createSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 300;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the Xinying center sign texture.');

  context.fillStyle = '#e8e5d9';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#d9ac42';
  context.fillRect(16, 16, 1168, 268);
  context.fillStyle = '#f6f0dc';
  context.fillRect(28, 28, 1144, 244);
  context.fillStyle = '#be7544';
  context.beginPath();
  context.arc(118, 150, 73, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fff8e6';
  context.font = '900 96px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  context.textBaseline = 'middle';
  context.fillText('樂活', 62, 151);
  context.fillStyle = '#315a70';
  context.font = '900 112px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  context.fillText('樂活新營日照中心', 225, 133, 900);
  context.fillStyle = '#59756b';
  context.font = '700 43px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  context.fillText('樂活新營住宿長照機構', 230, 231, 880);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createVerticalSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 820;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the Xinying vertical sign texture.');
  context.fillStyle = '#d8b548';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f5efcf';
  context.fillRect(14, 14, canvas.width - 28, canvas.height - 28);
  context.fillStyle = '#567b51';
  context.font = '900 92px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  ['樂', '活', '新', '營', '日', '照', '中', '心'].forEach((character, index) => {
    context.fillText(character, canvas.width / 2, 60 + index * 98);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createXinyingBuilding() {
  const root = new THREE.Group();
  const batches = new Map<Surface, THREE.BufferGeometry[]>();
  const box = (position: Point, size: Point, surface: Surface) => {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(...position);
    const batch = batches.get(surface) ?? [];
    batch.push(geometry);
    batches.set(surface, batch);
  };
  const front = 5.7;

  box([0, 0.2, 0], [13.8, 0.4, 12.6], 'concrete');
  box([0, 8.7, 0], [13.1, 16.6, 11.6], 'wall');
  box([1.2, 20.25, -0.5], [10.5, 6.8, 10.4], 'wall');
  box([0, 0.52, 0], [13.35, 0.24, 11.85], 'trim');

  for (const y of [2.4, 5.0]) {
    for (const x of [-5.0, -2.5, 0, 2.5, 5.0]) {
      box([x, y, front + 0.05], [1.65, 1.65, 0.12], 'frame');
      box([x, y, front + 0.13], [1.42, 1.4, 0.05], 'glass');
      box([x, y - 0.72, front + 0.18], [1.4, 0.12, 0.05], 'trim');
    }
  }
  box([-0.95, 1.65, front + 0.2], [1.4, 2.6, 0.16], 'frame');
  box([-0.95, 1.65, front + 0.3], [1.17, 2.38, 0.05], 'glass');
  box([-0.95, 1.65, front + 0.34], [0.07, 2.32, 0.04], 'trim');

  const upperWindowRows = [10.0, 13.6, 17.2, 20.2, 23.2];
  for (const y of upperWindowRows) {
    for (const x of [-4.6, -2.0, 0.6, 3.2, 5.1]) {
      const upperFloor = y > 18;
      box([x, y, front + 0.05], [upperFloor ? 1.45 : 1.7, 0.95, 0.1], 'frame');
      box([x, y, front + 0.12], [upperFloor ? 1.22 : 1.46, 0.7, 0.045], 'glass');
    }
  }
  for (const y of [11.2, 14.8, 18.4, 24.4]) {
    box([1.3, y, front + 0.12], [1.4, 0.78, 0.18], 'roof');
    for (let i = 0; i < 5; i++) {
      box([1.3, y - 0.28 + i * 0.14, front + 0.23], [1.48, 0.035, 0.05], 'frame');
    }
  }

  for (const y of [6.8, 14.5, 18.1, 22.0, 25.2]) {
    box([0.6, y, front + 0.03], [10.8, 0.18, 0.16], 'trim');
  }
  box([0, 26.95, -0.2], [10.9, 0.22, 10.6], 'roof');
  box([1.5, 27.3, -0.5], [4.1, 0.5, 4.2], 'wall');

  const cageBottom = 7.0, cageTop = 13.2, cageFront = front + 1.05;
  for (const x of [-6.25, -3.2, 0, 3.2, 6.25]) {
    box([x, (cageBottom + cageTop) / 2, cageFront], [0.14, cageTop - cageBottom, 0.14], 'frame');
  }
  for (const y of [cageBottom, cageTop]) {
    box([0, y, cageFront], [12.6, 0.14, 0.14], 'frame');
  }
  for (let x = -6.0; x <= 6.01; x += 0.28) {
    box([x, (cageBottom + cageTop) / 2, cageFront], [0.035, cageTop - cageBottom - 0.12, 0.045], 'mesh');
  }
  for (let y = cageBottom + 0.24; y < cageTop; y += 0.24) {
    box([0, y, cageFront], [12.5, 0.035, 0.045], 'mesh');
  }

  box([0, 10.1, cageFront + 0.12], [8.4, 1.65, 0.16], 'sign');
  box([0, 9.15, cageFront + 0.1], [6.1, 0.12, 0.15], 'trim');
  box([0, 7.85, cageFront + 0.1], [6.1, 0.12, 0.15], 'trim');

  box([0, 0.08, 7.25], [6.6, 0.16, 2.5], 'paving');
  for (const x of [-5.0, 5.0]) {
    box([x, 0.26, 6.9], [2.1, 0.44, 1.8], 'concrete');
    for (let i = 0; i < 5; i++) {
      const shrub = new THREE.IcosahedronGeometry(0.52, 0);
      shrub.translate(x + (i - 2) * 0.32, 0.7, 6.9 + (i % 2) * 0.18);
      const batch = batches.get('green') ?? [];
      batch.push(shrub);
      batches.set('green', batch);
    }
  }
  for (const x of [-3.6, 3.6]) {
    box([x, 0.42, 7.5], [1.65, 0.68, 0.5], 'trim');
    box([x, 0.8, 7.5], [1.72, 0.12, 0.58], 'frame');
  }

  const colors: Record<Surface, string> = {
    concrete: '#c9c7bd',
    wall: '#e8e9e5',
    trim: '#f0eee4',
    glass: '#aeb8a7',
    frame: '#627b88',
    mesh: '#35a7ae',
    sign: '#d8b548',
    roof: '#74818a',
    paving: '#c9b8a2',
    green: '#6f9252',
  };
  for (const [surface, geometries] of batches) {
    const geometry = mergeGeometries(geometries);
    geometries.forEach(item => item.dispose());
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: colors[surface],
      roughness: surface === 'glass' ? 0.4 : 0.84,
      metalness: surface === 'frame' || surface === 'mesh' || surface === 'roof' ? 0.25 : 0,
    }));
    mesh.name = `xinying-center-${surface}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  const mainSign = new THREE.Mesh(
    new THREE.PlaneGeometry(8.15, 2.04),
    new THREE.MeshStandardMaterial({ map: createSignTexture(), roughness: 0.82, side: THREE.DoubleSide }),
  );
  mainSign.name = 'xinying-center-main-sign';
  mainSign.position.set(0, 10.1, cageFront + 0.22);
  root.add(mainSign);

  const verticalSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 3.9),
    new THREE.MeshStandardMaterial({ map: createVerticalSignTexture(), roughness: 0.84, side: THREE.DoubleSide }),
  );
  verticalSign.name = 'xinying-center-vertical-sign';
  verticalSign.position.set(-6.48, 19.2, front + 0.16);
  root.add(verticalSign);
  return root;
}

export function XinyingCenterBuilding() {
  const host = useRef<THREE.Group>(null);
  useEffect(() => {
    const container = host.current!;
    const model = createXinyingBuilding();
    container.add(model);
    return () => {
      container.remove(model);
      disposeModels([model]);
    };
  }, []);

  return (
    <group
      ref={host}
      name="xinying-center-building"
      position={[xinying.x, 0, xinying.z]}
      rotation={[0, xinying.rotation ?? 0, 0]}
    />
  );
}
