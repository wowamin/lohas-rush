import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildings, HEADQUARTERS_FOOTPRINT_SCALE } from '../data/city';
import { disposeModels } from './assets/GameAssets';

type Point = [number, number, number];
type Surface = 'wall' | 'frame' | 'glass';
const headquarters = buildings.find(building => building.id === 'headquarters')!;

// A game-scale interpretation of the supplied white building reference.
// All repeated windows, balcony bars and trims are merged into three meshes.
function createHeadquartersBuilding() {
  const root = new THREE.Group(), batches = new Map<Surface, THREE.BufferGeometry[]>();
  const white = headquarters.color, trim = '#e7e4dc', dark = '#28323b', glass = '#6b8798';
  const add = (source: THREE.BufferGeometry, p: Point, color: string, surface: Surface = 'wall', rotation = 0) => {
    const geometry = source.index ? source.toNonIndexed() : source.clone(); source.dispose();
    geometry.deleteAttribute('uv'); geometry.rotateY(rotation); geometry.translate(...p);
    const tint = new THREE.Color(color), colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) tint.toArray(colors, i);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const batch = batches.get(surface) ?? []; batch.push(geometry); batches.set(surface, batch);
  };
  const box = (p: Point, size: Point, color: string, surface: Surface = 'wall') => add(new THREE.BoxGeometry(...size), p, color, surface);
  // White stucco volumes, a taller stair tower, pale plinth and flat roof fascia.
  box([.95, 5.6, 0], [8.1, 10.6, 10], white);
  box([-4.05, 5.75, 0], [1.9, 10.9, 10], white);
  box([0, .40, 0], [10.04, .19, 10.04], '#deddd6');
  box([.95, 10.99, 0], [8.28, .26, 10.24], white);
  box([-4.05, 11.24, 0], [2.06, .20, 10.14], white);
  box([.95, 10.81, 5.04], [8.18, .07, .12], trim);

  function frontWindow(x: number, y: number, width: number, height: number) {
    box([x, y, 5.025], [width + .20, height + .20, .10], trim);
    box([x, y, 5.085], [width, height, .08], dark, 'frame');
    box([x, y, 5.134], [width - .13, height - .13, .035], glass, 'glass');
    box([x, y, 5.163], [.048, height, .035], dark, 'frame');
    box([x, y + height * .12, 5.165], [width, .045, .035], dark, 'frame');
    box([x, y - height / 2 - .11, 5.14], [width + .27, .09, .28], white);
  }
  for (const y of [1.76, 8.2]) {
    for (const x of [-4.47, -3.73]) frontWindow(x, y, .34, y < 2 ? 2.5 : 2.1);
  }
  frontWindow(-2.04, 1.68, 1.28, 2.15);
  frontWindow(3.52, 1.68, 2.02, 2.15);
  for (const y of [8.2]) {
    frontWindow(-.65, y, 2.65, 2.05);
    frontWindow(3.36, y, 1.72, 2.05);
  }
  // Windows on both side walls keep the building finished from driving angles.
  for (const side of [-1, 1]) for (const y of [1.75, 8.2]) for (const z of [-3.25, -.15, 2.9]) {
    box([side * 5.025, y, z], [.10, 2.15, 1.55], trim);
    box([side * 5.085, y, z], [.08, 1.95, 1.35], dark, 'frame');
    box([side * 5.135, y, z], [.035, 1.80, 1.20], glass, 'glass');
    box([side * 5.162, y, z], [.035, 1.95, .043], dark, 'frame');
    box([side * 5.16, y - 1.13, z], [.26, .09, 1.67], white);
  }
  for (const x of [-3.5, 0, 3.5]) for (const y of [1.75, 8.2]) {
    box([x, y, -5.045], [1.45, 2.05, .08], dark, 'frame');
    box([x, y, -5.095], [1.28, 1.88, .035], glass, 'glass');
  }

  function balcony(x: number, floorY: number, width: number) {
    const front = 5.72, left = x - width / 2, right = x + width / 2;
    box([x, floorY, 5.28], [width + .18, .20, 1.08], white);
    box([x, floorY + .12, 5.28], [width, .035, .94], trim);
    box([x, floorY + 1.0, front], [width + .06, .055, .055], dark, 'frame');
    box([x, floorY + .24, front], [width + .06, .035, .035], dark, 'frame');
    const bars = Math.ceil(width / .14);
    for (let i = 0; i <= bars; i++) box([left + width * i / bars, floorY + .61, front], [.025, .78, .027], dark, 'frame');
    for (const edge of [left, right]) {
      box([edge, floorY + 1.0, 5.34], [.055, .055, .80], dark, 'frame');
      for (let i = 0; i <= 5; i++) box([edge, floorY + .61, 4.97 + i * .15], [.025, .78, .025], dark, 'frame');
    }
  }
  for (const y of [5.48]) { balcony(-.65, y, 3.03); balcony(3.35, y, 2.24); }
  // Dark rooftop guardrails echo the reference's flat-roof silhouette.
  for (const z of [-4.96, 4.96]) {
    box([.96, 11.77, z], [8.08, .055, .055], dark, 'frame');
    for (let x = -3.06; x <= 4.99; x += .15) box([x, 11.45, z], [.025, .64, .025], dark, 'frame');
  }
  for (const x of [-3.06, 4.96]) {
    box([x, 11.77, 0], [.055, .055, 9.94], dark, 'frame');
    for (let z = -4.96; z <= 4.97; z += .15) box([x, 11.45, z], [.025, .64, .025], dark, 'frame');
  }
  // Porthole windows form the vertical accent beside the balconies.
  for (const y of [8.55]) {
    add(new THREE.CircleGeometry(.38, 40), [1.40, y, 5.08], dark, 'frame');
    add(new THREE.CircleGeometry(.315, 40), [1.40, y, 5.105], glass, 'glass');
    add(new THREE.TorusGeometry(.405, .025, 8, 40), [1.40, y, 5.09], trim);
  }
  // Keep the original entrance and chairperson's standing space.
  box([0, 1.43, 5.08], [2.6, 2.25, .12], dark, 'frame');
  for (const side of [-1, 1]) {
    box([side * .61, 1.44, 5.16], [1.12, 2.02, .06], '#7896a2', 'glass');
    box([side * .13, 1.35, 5.22], [.055, .38, .06], '#c9ced0', 'frame');
  }
  box([0, 2.72, 5.5], [3.4, .18, 1.4], white);
  box([0, 2.61, 5.5], [3.32, .04, 1.32], trim);

  for (const [surface, shapes] of batches) {
    const geometry = mergeGeometries(shapes); shapes.forEach(shape => shape.dispose());
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true,
      roughness: surface === 'glass' ? .27 : surface === 'frame' ? .57 : .9,
      metalness: surface === 'glass' ? .15 : surface === 'frame' ? .25 : 0 }));
    mesh.name = `headquarters-${surface}`; mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
  }
  return root;
}

export function HeadquartersBuilding() {
  const host = useRef<THREE.Group>(null);
  useEffect(() => {
    const container = host.current!, model = createHeadquartersBuilding(); container.add(model);
    return () => { container.remove(model); disposeModels([model]); };
  }, []);
  return <group ref={host} name="headquarters-white-building" position={[headquarters.x, 0, headquarters.z]}
    scale={[HEADQUARTERS_FOOTPRINT_SCALE, 1, HEADQUARTERS_FOOTPRINT_SCALE]} />;
}
