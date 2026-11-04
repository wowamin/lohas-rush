import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { birthdayCake } from '../data/city';
import { disposeModels } from './assets/GameAssets';

type Point = [number, number, number];
type Surface = 'icing' | 'decoration' | 'stand';

// Original three-dimensional party cake inspired by the supplied reference.
function createBirthdayCake() {
  const root = new THREE.Group(), batches = new Map<Surface, THREE.BufferGeometry[]>();
  const pink = '#f34d91', yellow = '#ffd03e', cyan = '#35d4e4';
  const candy = ['#ff962e', '#f35346', '#ffda39', '#9b45d4', '#22b7da'];
  function add(source: THREE.BufferGeometry, color: string, p: Point = [0, 0, 0], s: Point = [1, 1, 1], surface: Surface = 'decoration', yaw = 0) {
    const geometry = source.index ? source.toNonIndexed() : source.clone(); source.dispose();
    geometry.deleteAttribute('uv'); geometry.scale(...s); geometry.rotateY(yaw); geometry.translate(...p);
    const tint = new THREE.Color(color), colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) tint.toArray(colors, i);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const shapes = batches.get(surface) ?? []; shapes.push(geometry); batches.set(surface, shapes);
  }
  const ball = (p: Point, r: number, color: string, s: Point = [1, 1, 1]) => add(new THREE.SphereGeometry(r, 16, 12), color, p, s);
  const cylinder = (p: Point, radius: number, height: number, color: string, surface: Surface = 'icing') =>
    add(new THREE.CylinderGeometry(radius, radius, height, 64), color, p, undefined, surface);
  function line(points: Point[], radius: number, color: string) {
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), points.length * 3, radius, 6, false), color);
  }
  function dripFrosting(radius: number, top: number, color: string, lobes: number) {
    cylinder([0, top, 0], radius + .021, .045, color);
    const vertices: number[] = [], indices: number[] = [], columns = 128, rows = 6;
    for (let row = 0; row <= rows; row++) for (let i = 0; i <= columns; i++) {
      const a = i / columns * Math.PI * 2, t = row / rows;
      const drip = .062 + .11 * ((Math.sin(a * lobes + .5) + 1) / 2) ** 5;
      const r = radius + .018 + Math.sin(t * Math.PI) * .012;
      vertices.push(Math.sin(a) * r, top - drip * t, Math.cos(a) * r);
    }
    for (let row = 0; row < rows; row++) for (let i = 0; i < columns; i++) {
      const a = row * (columns + 1) + i, b = a + columns + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const shape = new THREE.BufferGeometry(); shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    shape.setIndex(indices); shape.computeVertexNormals(); add(shape, color, undefined, undefined, 'icing');
  }
  function star(p: Point, color: string, yaw: number) {
    const outline = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? .035 : .073;
      if (i === 0) outline.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else outline.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    outline.closePath();
    add(new THREE.ExtrudeGeometry(outline, { depth: .015, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2, steps: 1 }), color, p, undefined, 'decoration', yaw);
  }
  // A low white display plinth supports the plate just above the entrance paving.
  add(new THREE.CylinderGeometry(.73, .78, .28, 64), '#f1e9d9', [0, .14, 0], undefined, 'stand');
  cylinder([0, .27, 0], .765, .025, '#d9b36b', 'stand');
  cylinder([0, .305, 0], .80, .045, '#e7edf0', 'stand');
  cylinder([0, .56, 0], .675, .47, pink);
  cylinder([0, .985, 0], .53, .38, '#f5d849');
  cylinder([0, 1.365, 0], .395, .36, '#26bfda');

  // Green diagonal fondant ribbons around the yellow middle tier.
  for (let i = 0; i < 14; i++) {
    const vertices: number[] = [];
    for (let row = 0; row <= 8; row++) for (const side of [-1, 1]) {
      const t = row / 8, a = i / 14 * Math.PI * 2 + t * .30 + side * .075;
      vertices.push(Math.sin(a) * .534, .81 + t * .34, Math.cos(a) * .534);
    }
    const indices: number[] = [];
    for (let j = 0; j < 8; j++) indices.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2);
    const shape = new THREE.BufferGeometry(); shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    shape.setIndex(indices); shape.computeVertexNormals(); add(shape, '#81ca43');
  }
  dripFrosting(.675, .795, '#ff65aa', 10);
  dripFrosting(.53, 1.185, yellow, 8);
  dripFrosting(.395, 1.55, cyan, 7);

  for (const [radius, y, color] of [[.681, .48, '#ffda51'], [.537, .94, '#bd55d7']] as const) {
    line(Array.from({ length: 81 }, (_, i) => {
      const a = i / 80 * Math.PI * 2;
      return [Math.sin(a) * radius, y + Math.sin(a * 8) * .032, Math.cos(a) * radius];
    }), .016, color);
  }
  cylinder([0, 1.285, 0], .401, .055, '#a452ca');
  for (let row = 0; row < 2; row++) for (let i = 0; i < 26; i++) {
    const a = (i + row * .5) / 26 * Math.PI * 2;
    ball([Math.sin(a) * .678, .385 + row * .16, Math.cos(a) * .678], .013, '#fff2d6');
  }
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * Math.PI * 2;
    add(new THREE.SphereGeometry(.043, 16, 10), '#fff0d1', [Math.sin(a) * .68, .35, Math.cos(a) * .68], [1.3, .66, .68], 'decoration', a + .4);
  }
  for (const [radius, y, count] of [[.58, .85, 14], [.445, 1.235, 12]] as const) for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2;
    ball([Math.sin(a) * radius, y, Math.cos(a) * radius], .044, candy[i % candy.length]);
  }
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2;
    ball([Math.sin(a) * .403, 1.286, Math.cos(a) * .403], .011, '#fff3db');
    if (i % 2 === 0) ball([Math.sin(a) * .399, 1.385, Math.cos(a) * .399], .022, '#f35da2');
  }
  for (let i = -2; i <= 2; i++) {
    const a = i * .56;
    star([Math.sin(a) * .65, .865, Math.cos(a) * .65], candy[(i + 3) % candy.length], a);
  }

  const flames = new THREE.Group(); flames.name = 'birthday-cake-flames';
  const fire = new THREE.MeshStandardMaterial({ color: '#ffc53e', emissive: '#ff901a', emissiveIntensity: .7, roughness: .5 });
  const core = new THREE.MeshBasicMaterial({ color: '#fff2a4', toneMapped: false });
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * .09, z = .17 - Math.abs(i - 3) * .055, height = .18 + (i % 3) * .025;
    cylinder([x, 1.55 + height / 2, z], .011, height, candy[i % candy.length], 'decoration');
    cylinder([x, 1.55 + height + .006, z], .003, .017, '#574433', 'decoration');
    const flame = new THREE.Mesh(new THREE.SphereGeometry(.023, 12, 12), fire);
    flame.position.set(x, 1.55 + height + .047, z); flame.scale.set(.72, 1.65, .72); flames.add(flame);
    const heart = new THREE.Mesh(new THREE.SphereGeometry(.012, 10, 10), core);
    heart.position.set(x, 1.55 + height + .032, z + .01); heart.scale.set(.7, 1.5, .7); flames.add(heart);
  }
  // Golden birthday topper is authored text, with its own thin support sticks.
  for (const side of [-1, 1]) cylinder([side * .28, 1.81, -.13], .006, .51, '#e7bb61', 'stand');
  for (const [surface, shapes] of batches) {
    const geometry = mergeGeometries(shapes); shapes.forEach(shape => shape.dispose());
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: surface === 'icing' ? .38 : .66,
      metalness: surface === 'stand' ? .16 : 0 });
    const mesh = new THREE.Mesh(geometry, material); mesh.name = `birthday-cake-${surface}`;
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
  }
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 240;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#f9ce62'; context.fillRect(0, 0, 1024, 240);
  context.strokeStyle = '#e79c39'; context.lineWidth = 12; context.strokeRect(8, 8, 1008, 224);
  context.font = '900 88px Arial, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillStyle = '#a43127'; context.fillText('HAPPY BIRTHDAY', 512, 125, 950);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const topper = new THREE.Mesh(new THREE.PlaneGeometry(.86, .20, 12, 1),
    new THREE.MeshStandardMaterial({ map: texture, roughness: .7, side: THREE.DoubleSide }));
  const points = topper.geometry.getAttribute('position');
  for (let i = 0; i < points.count; i++) points.setY(i, points.getY(i) + .045 * (1 - (points.getX(i) / .43) ** 2));
  topper.geometry.computeVertexNormals(); topper.position.set(0, 2.045, -.13); root.add(topper);
  root.add(flames); return { root, flames };
}

export function BirthdayCake() {
  const host = useRef<THREE.Group>(null), model = useRef<ReturnType<typeof createBirthdayCake>>();
  useEffect(() => {
    const container = host.current!, cake = createBirthdayCake(); model.current = cake; container.add(cake.root);
    return () => { container.remove(cake.root); disposeModels([cake.root]); model.current = undefined; };
  }, []);
  useFrame(({ clock }) => {
    model.current?.flames.children.forEach((flame, i) => {
      flame.scale.y = (i % 2 ? 1.5 : 1.65) * (1 + Math.sin(clock.elapsedTime * 5 + i * 1.7) * .075);
    });
  });
  return <group ref={host} name="headquarters-birthday-cake" position={[birthdayCake.x, 0, birthdayCake.z]} />;
}
