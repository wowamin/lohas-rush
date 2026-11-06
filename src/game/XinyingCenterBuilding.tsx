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
  canvas.width = 1536;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the Xinying center sign texture.');

  context.fillStyle = '#55766d';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#faf6e7';
  context.fillRect(12, 12, 1512, 296);
  context.fillStyle = '#577c69';
  context.beginPath();
  context.arc(140, 160, 88, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fff8e6';
  context.font = '700 112px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('樂', 140, 160);
  context.textAlign = 'left';
  context.fillStyle = '#31594e';
  context.font = '700 122px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  context.fillText('樂活新營日照中心', 280, 127, 1180);
  context.fillStyle = '#59756b';
  context.font = '500 43px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
  context.fillText('LOHAS DAY CARE  /  XINYING', 288, 242, 1150);

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
  context.fillStyle = '#55766d';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f5efcf';
  context.fillRect(14, 14, canvas.width - 28, canvas.height - 28);
  context.fillStyle = '#31594e';
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
  const front = 5.8;

  // One continuous structural volume reaches the roof. Every upper window and
  // slab is attached to this body; the former setback left facade parts in air.
  box([0, 0.2, 0], [13.8, 0.4, 12.6], 'concrete');
  box([0, 13.4, 0], [13.1, 26, 11.6], 'wall');
  box([0, 0.52, 0], [13.35, 0.24, 11.85], 'trim');
  for (const y of [4.25, 7.4, 10.55, 13.7, 16.85, 20, 23.15, 26.3]) {
    box([0, y, 0], [13.45, .16, 11.95], 'trim');
  }
  const windowRows=[5.85,9,12.15,15.3,18.45,21.6,24.75];
  const frontWindow=(x:number,y:number,z:number,width:number,height:number)=>{
    const direction=Math.sign(z);
    box([x,y,z],[width+.22,height+.22,.16],'frame');
    box([x,y,z+direction*.105],[width,height,.045],'glass');
    box([x,y-height/2-.16,z+direction*.14],[width+.35,.12,.35],'trim');
    box([x,y,z+direction*.14],[.055,height,.05],'frame');
  };
  for(const y of windowRows){
    for(const x of [-4.8,-2.4,0,2.4,4.8]){
      frontWindow(x,y,front+.08,1.6,1.65);
      frontWindow(x,y,-front-.08,1.6,1.65);
    }
    for(const side of [-1,1])for(const z of [-3.65,0,3.65]){
      box([side*6.63,y,z],[.16,1.87,2.02],'frame');
      box([side*6.735,y,z],[.045,1.65,1.8],'glass');
      box([side*6.77,y-.99,z],[.35,.12,2.15],'trim');
      box([side*6.77,y,z],[.05,1.65,.055],'frame');
    }
  }
  // Ground-floor lobby and a continuous entrance canopy, rather than windows
  // crossing through an oversized single door.
  frontWindow(-4.65,2.05,front+.08,2.25,2.2);
  for(const x of [2.05,4.4])frontWindow(x,2.0,front+.08,2.0,2.45);
  box([-1.45,1.92,front+.10],[2.85,3.04,.18],'frame');
  for(const x of [-2.11,-.79])box([x,1.92,front+.22],[1.21,2.84,.055],'glass');
  box([-1.45,1.92,front+.26],[.075,2.86,.055],'trim');
  for(const x of [-1.59,-1.31])box([x,1.79,front+.30],[.045,.38,.05],'sign');
  box([0,3.72,6.02],[13.45,.22,1.58],'roof');
  box([0,3.58,6.23],[11.6,.06,.65],'sign');
  for(const side of [-1,1])for(const z of [-3.65,0,3.65]){
    box([side*6.63,2.05,z],[.16,2.55,2.02],'frame');
    box([side*6.735,2.05,z],[.045,2.32,1.8],'glass');
  }
  // Supported roof slab, a low parapet and a compact rooftop service volume.
  box([0,26.5,0],[13.7,.3,12.2],'roof');
  for(const z of [-5.92,5.92])box([0,27.05,z],[13.5,.8,.18],'wall');
  for(const x of [-6.65,6.65])box([x,27.05,0],[.18,.8,11.8],'wall');
  box([2.7,27.1,-2.3],[3.2,.9,3.0],'wall');
  box([2.7,27.54,-2.3],[3.35,.08,3.15],'roof');

  // Keep the recognisable blue-green screen, with fewer bars and actual side
  // brackets joining it to the facade. All raised features fit the 7x7 bound.
  const cageBottom=7.9,cageTop=13.15,cageFront=6.4;
  for(const x of [-5.9,-2,2,5.9]){
    box([x,(cageBottom+cageTop)/2,cageFront],[.12,cageTop-cageBottom,.12],'frame');
    for(const y of [cageBottom,cageTop])box([x,y,6.08],[.12,.12,.75],'frame');
  }
  for(const y of [cageBottom,cageTop])box([0,y,cageFront],[11.92,.12,.12],'frame');
  for(let x=-5.65;x<=5.66;x+=.42)box([x,10.525,cageFront],[.035,5.1,.04],'mesh');
  for(let y=8.2;y<13.1;y+=.42)box([0,y,cageFront],[11.8,.035,.04],'mesh');
  box([0,10.5,cageFront+.13],[9.3,2.04,.16],'sign');
  box([-6.1,19.5,front+.1],[1.13,4.25,.18],'sign');

  box([0, 0.08, 7.25], [6.6, 0.16, 2.5], 'paving');
  for (const x of [-5.0, 5.0]) {
    box([x, 0.26, 6.2], [2.1, 0.44, 1.0], 'concrete');
    for (let i = 0; i < 5; i++) {
      const shrub = new THREE.IcosahedronGeometry(0.43, 0);
      shrub.translate(x + (i - 2) * 0.32, 0.68, 6.23 + (i % 2) * 0.12);
      const batch = batches.get('green') ?? [];
      batch.push(shrub);
      batches.set('green', batch);
    }
  }
  for (const x of [-3.5, 3.5]) {
    box([x, 0.42, 6.4], [1.45, 0.68, 0.4], 'trim');
    box([x, 0.8, 6.4], [1.58, 0.12, 0.48], 'frame');
  }

  const colors: Record<Surface, string> = {
    concrete: '#c9c7bd',
    wall: '#f0f0e9',
    trim: '#f0eee4',
    glass: '#82a4ac',
    frame: '#4d6570',
    mesh: '#7aa8a2',
    sign: '#c7c5ab',
    roof: '#82928c',
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
    new THREE.PlaneGeometry(9.12, 1.9),
    new THREE.MeshStandardMaterial({ map: createSignTexture(), roughness: 0.82, side: THREE.DoubleSide }),
  );
  mainSign.name = 'xinying-center-main-sign';
  mainSign.position.set(0, 10.5, cageFront + 0.225);
  root.add(mainSign);

  const verticalSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 3.73),
    new THREE.MeshStandardMaterial({ map: createVerticalSignTexture(), roughness: 0.84, side: THREE.DoubleSide }),
  );
  verticalSign.name = 'xinying-center-vertical-sign';
  verticalSign.position.set(-6.1, 19.5, front + 0.205);
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
