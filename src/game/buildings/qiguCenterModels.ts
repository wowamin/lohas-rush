import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSurface, worldScaleMaps } from '../rendering/materials.ts';

export type QiguCenterId = 'longshan' | 'yihe';
type Point = [number, number, number];
type Surface = 'tile' | 'trim' | 'stone' | 'glass' | 'metal' | 'dark' | 'roof';

/** Photo-inspired front elevations, fitted inside the unchanged 12 x 12 x 7 envelope.
 * Yihe's unseen upper, side and rear elevations are deliberately plain game massing.
 * Textures are supplied by the view so geometry can be checked without a DOM.
 */
export function createQiguCenterModel(id: QiguCenterId, signTexture: THREE.Texture, headerTexture?: THREE.Texture) {
  const root = new THREE.Group();
  root.name = `${id}-center-model`;
  root.userData.reference = 'user-attachment';
  root.userData.reconstruction = 'photo-inspired-game-exterior';
  const batches = new Map<Surface, THREE.BufferGeometry[]>();
  const add = (source: THREE.BufferGeometry, surface: Surface, position: Point, rotation: Point = [0, 0, 0]) => {
    const transform = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation));
    transform.setPosition(...position); source.applyMatrix4(transform);
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    const batch = batches.get(surface) ?? []; batch.push(geometry); batches.set(surface, batch);
  };
  const box = (position: Point, size: Point, surface: Surface) => add(new THREE.BoxGeometry(...size), surface, position);
  const column = (x: number, y: number, z: number, height: number, radius: number, surface: Surface) => {
    add(new THREE.CylinderGeometry(radius, radius, height, 12), surface, [x, y, z]);
    for (const end of [-1, 1]) box([x, y + end * (height / 2 - .08), z], [radius * 2.8, .16, radius * 2.8], 'trim');
  };
  const window = (x: number, y: number, width: number, height: number, bars = false, z = 3.65) => {
    box([x, y, z], [width + .18, height + .18, .12], 'trim');
    box([x, y, z + .08], [width, height, .06], 'glass');
    for (const side of [-1, 0, 1]) box([x + side * width / 3, y, z + .13], [.055, height, .055], 'metal');
    box([x, y + height * .18, z + .13], [width, .055, .055], 'metal');
    if (bars) {
      for (let dx = -width / 2 + .12; dx < width / 2; dx += .18) box([x + dx, y, z + .2], [.024, height, .035], 'metal');
      for (const dy of [-height * .28, height * .28]) box([x, y + dy, z + .2], [width, .03, .04], 'metal');
    }
  };
  const arch = (width: number, springY: number, rise: number, z: number, surface: Surface) => {
    const half = width / 2, thickness = .28;
    const shape = new THREE.Shape();
    shape.moveTo(-half, springY);
    shape.quadraticCurveTo(0, springY + rise * 2, half, springY);
    shape.lineTo(half, springY + thickness);
    shape.quadraticCurveTo(0, springY + rise * 2 + thickness, -half, springY + thickness);
    shape.closePath();
    add(new THREE.ExtrudeGeometry(shape, { depth: .36, bevelEnabled: false, curveSegments: 18 }), surface, [0, 0, z]);
  };
  const sign = (texture: THREE.Texture, width: number, height: number, position: Point, name: string) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: .85 }));
    mesh.position.set(...position); mesh.name = `${id}-center-${name}`; root.add(mesh);
  };

  box([0, .12, 0], [11.8, .24, 11.8], 'stone');
  box([0, 3.28, -.8], [11.2, 6.1, 8.7], 'tile');
  box([0, 6.4, -.8], [11.6, .18, 8.9], 'roof');
  // Doorway recess is visible behind the columns; the building remains a solid obstacle.
  box([0, 1.5, 3.58], [3.1, 2.55, .08], 'dark');
  window(0, 1.47, 2.65, 2.35, false, 3.64);
  for (const side of [-1, 1]) box([side * .68, 1.47, 3.84], [.045, 2.3, .055], 'metal');
  for (let i = 0; i < 3; i++) box([0, .10 + i * .085, 5.48 - i * .38], [3.65, .2 + i * .17, .64], 'stone');

  if (id === 'longshan') {
    for (const x of [-4.25, 4.25]) {
      window(x, 1.55, 2.1, 1.95, true);
      window(x, 4.45, 2.1, 1.85);
      // Circular upper windows and pale rings are the distinctive photographed wings.
      add(new THREE.CircleGeometry(.37, 24), 'glass', [x, 5.88, 3.7]);
      add(new THREE.TorusGeometry(.4, .065, 6, 28), 'trim', [x, 5.88, 3.77]);
      box([x, 2.75, 3.99], [.64, .78, .46], 'trim');
      add(new THREE.CylinderGeometry(.23, .23, .035, 16), 'metal', [x, 2.75, 4.24], [Math.PI / 2, 0, 0]);
    }
    box([0, 3.4, 4.28], [5.85, .22, 1.75], 'trim');
    window(0, 4.55, 4.65, 1.65);
    for (const x of [-2.58, 2.58]) column(x, 4.62, 4.7, 2.25, .18, 'trim');
    box([0, 3.94, 4.96], [5.25, .055, .055], 'metal');
    for (let x = -2.5; x <= 2.51; x += .25) box([x, 3.7, 4.96], [.028, .48, .04], 'metal');
    arch(5.4, 5.65, .38, 4.63, 'tile');
    box([0, 6.55, 4.65], [5.75, .7, .55], 'tile');
    box([0, 6.94, 4.65], [5.86, .1, .62], 'trim');
    for (const x of [-4.3, 4.3]) box([x, 3.3, 3.95], [2.7, .16, .85], 'trim');
    box([0, 2.91, 5.06], [4.9, .97, .22], 'trim');
    sign(signTexture, 4.65, .8, [0, 2.91, 5.19], 'sign');
    if (headerTexture) sign(headerTexture, 4.8, .4, [0, 6.52, 4.94], 'header');
  } else {
    for (const x of [-4.25, 4.25]) {
      window(x, 2.05, 2.2, 2.45);
      box([x, .66, 3.73], [2.25, .55, .18], 'tile');
      box([x, 4.2, 3.95], [2.65, .22, .72], 'tile');
    }
    for (const x of [-2.6, 2.6]) {
      column(x, 2.25, 4.52, 3.85, .29, 'tile');
      box([x, .38, 4.52], [.85, .35, .85], 'tile');
      box([x, 4.16, 4.52], [1.0, .24, 1.0], 'tile');
    }
    arch(5.65, 4.15, .68, 4.2, 'tile');
    box([0, 4.95, 3.7], [6.9, .22, .45], 'tile');
    box([0, 3.67, 3.9], [4.55, .48, .32], 'metal');
    box([0, 2.99, 3.95], [4.6, 1.25, .22], 'trim');
    sign(signTexture, 4.38, 1.07, [0, 2.99, 4.07], 'sign');
    // Entry grille is simplified geometry, not a downloaded photo or an invented interior.
    for (let x = -.9; x <= .91; x += .18) box([x, 1.48, 3.85], [.018, 2.2, .022], 'metal');
    for (let y = .48; y < 2.55; y += .2) box([0, y, 3.85], [1.9, .018, .022], 'metal');
    for (const side of [-1, 1]) {
      const x = side * 1.98;
      for (const y of [.55, .92]) box([x, y, 5.16], [.045, .045, 1.2], 'metal');
      for (const z of [4.67, 5.65]) box([x, .55, z], [.045, .75, .045], 'metal');
    }
  }

  const colors: Record<Surface, string> = {
    tile: id === 'longshan' ? '#aa929e' : '#bd929c', trim: '#e1ddd2', stone: '#bab6af',
    glass: '#43565a', metal: '#9baba7', dark: '#263432', roof: '#777678',
  };
  for (const [surface, geometries] of batches) {
    const geometry = mergeGeometries(geometries);
    geometries.forEach(item => item.dispose());
    const material = surface === 'tile'
      ? worldScaleMaps(new THREE.MeshStandardMaterial({ color: colors.tile, roughness: .84 }), 'tile', .3)
      : createSurface(surface === 'trim' ? 'plaster' : surface === 'stone' ? 'concrete' : surface === 'dark' ? 'glass' : surface === 'roof' ? 'metal' : surface, { color: colors[surface] });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${id}-center-${surface}`;
    mesh.castShadow = surface !== 'glass' && surface !== 'dark'; mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
