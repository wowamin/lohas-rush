import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Point = [number, number, number];
export type CharacterAdd = (geometry: THREE.BufferGeometry, color: string, position?: Point, scale?: Point, rotation?: Point) => void;
type Finish = 'skin' | 'fabric' | 'hair' | 'gloss' | 'metal';

export function roundedCharacterBox(size: Point, roundness = .21) {
  return new RoundedBoxGeometry(...size, 2, Math.min(...size) * roundness);
}

export function tailoredCharacterGeometry(profile: [y: number, width: number, depth: number][]) {
  const vertices: number[] = [], indices: number[] = [], segments = 32;
  for (const [y, width, depth] of profile) for (let j = 0; j <= segments; j++) {
    const angle = j / segments * Math.PI * 2;
    vertices.push(Math.sin(angle) * width, y, Math.cos(angle) * depth);
  }
  for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < segments; j++) {
    const a = i * (segments + 1) + j, b = a + segments + 1;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

// Each animated part owns its geometry and materials. Palette colours are baked
// into vertices so fine details do not add a draw call for every different tint.
export class CharacterGeometry {
  private batches = new Map<Finish, THREE.BufferGeometry[]>();
  private skin: string;
  private hair: string[];
  private metal: string[];
  constructor(skin: string, hair: string[] = [], metal: string[] = []) {
    this.skin = skin; this.hair = hair; this.metal = metal;
  }
  add: CharacterAdd = (source, color, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) => {
    const geometry = source.index ? source.toNonIndexed() : source.clone(); source.dispose();
    const transform = new THREE.Object3D(); transform.position.set(...position); transform.scale.set(...scale);
    transform.rotation.set(...rotation); transform.updateMatrix(); geometry.applyMatrix4(transform.matrix); geometry.deleteAttribute('uv');
    const tint = new THREE.Color(color), positions = geometry.getAttribute('position');
    // Face blush already contains a colour attribute, which must survive batching.
    if (!geometry.hasAttribute('color')) {
      const colors = new Float32Array(positions.count * 3);
      for (let i = 0; i < positions.count; i++) tint.toArray(colors, i * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    const surface: Finish = color === this.skin || ['#f3c6a9', '#dea28d'].includes(color) ? 'skin'
      : this.hair.includes(color) ? 'hair' : this.metal.includes(color) ? 'metal'
      : ['#fff9ef', '#fff8ee', '#38292b', '#765039', '#d88787', '#853e43'].includes(color) ? 'gloss' : 'fabric';
    const batch = this.batches.get(surface) ?? []; batch.push(geometry); this.batches.set(surface, batch);
  };
  box = (p: Point, size: Point, color: string) => this.add(roundedCharacterBox(size), color, p);
  ball = (p: Point, radius: number, color: string, scale: Point = [1, 1, 1]) =>
    this.add(new THREE.SphereGeometry(radius, 20, 14), color, p, scale);
  tube = (a: Point, b: Point, radius: number, color: string) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), axis = to.clone().sub(from);
    const geometry = new THREE.CylinderGeometry(radius, radius, axis.length(), 16);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize()));
    this.add(geometry, color, from.add(to).multiplyScalar(.5).toArray() as Point);
  };
  curve = (points: Point[], radius: number, color: string) => {
    this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))),
      Math.max(10, points.length * 4), radius, 6, false), color);
  };
  finish() {
    const group = new THREE.Group();
    for (const [surface, shapes] of this.batches) {
      const geometry = mergeGeometries(shapes); shapes.forEach(shape => shape.dispose());
      const material = new THREE.MeshStandardMaterial({ vertexColors: true,
        roughness: { skin: .6, fabric: .9, hair: .5, gloss: .27, metal: .33 }[surface],
        metalness: surface === 'metal' ? .45 : 0 });
      const mesh = new THREE.Mesh(geometry, material); mesh.name = `character-${surface}`;
      mesh.castShadow = true; mesh.receiveShadow = surface !== 'hair' && surface !== 'gloss'; group.add(mesh);
    }
    this.batches.clear(); return group;
  }
}

// Face features follow the ellipsoid rather than floating in front of it.
// The same proportions and surface quality apply to every member of the cast.
export function addCharacterFace(add: CharacterAdd, center: Point, radii: Point, skin: string, elderly = false) {
  const [cx, cy, cz] = center, [rx, ry, rz] = radii;
  const shape = new THREE.SphereGeometry(1, 36, 26), positions = shape.getAttribute('position');
  const colors = new Float32Array(positions.count * 3), tint = new THREE.Color(skin), blush = new THREE.Color('#e99a94');
  const c = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const weight = Math.exp(-((Math.abs(x) - .59) ** 2 / .065 + (y + .29) ** 2 / .035)) * Math.max(0, z);
    c.copy(tint).lerp(blush, weight * .5); c.toArray(colors, i * 3);
  }
  shape.setAttribute('color', new THREE.BufferAttribute(colors, 3)); add(shape, skin, center, radii);
  const at = (x: number, y: number, lift = .003): Point => [cx + x * rx, cy + y * ry,
    cz + rz * Math.sqrt(Math.max(.04, 1 - x * x - y * y)) + lift];
  const ball = (p: Point, radius: number, color: string, scale: Point = [1, 1, 1]) => add(new THREE.SphereGeometry(radius, 20, 14), color, p, scale);
  const line = (points: Point[], radius: number, color: string) => add(new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 16, radius, 6, false), color);
  for (const side of [-1, 1]) {
    ball([cx + side * rx * .99, cy - ry * .04, cz], rx * .19, skin, [.65, 1.1, .85]);
    ball([cx + side * rx * 1.055, cy - ry * .04, cz + .014], rx * .092, '#dea28d', [.25, 1, .8]);
    const [x, y, z] = at(side * .38, .19, .001), eye = rx * .254;
    ball([x, y, z], eye, '#fff9ef', [1, 1.09, .38]);
    ball([x, y - .002, z + eye * .30], eye * .65, '#765039', [1, 1.10, .28]);
    ball([x, y - .003, z + eye * .46], eye * .43, '#38292b', [1, 1.14, .20]);
    ball([x - eye * .19, y + eye * .29, z + eye * .57], eye * .19, '#fff9ef', [1, 1, .35]);
    ball([x + eye * .20, y - eye * .28, z + eye * .56], eye * .07, '#fff9ef');
    line([at(side * .18, .59, .007), at(side * .36, .64, .007), at(side * .55, .59, .007)], rx * .036, '#695044');
    const lash: Point[] = [-1, -.5, 0, .5, 1].map(t => at(side * .38 + t * .245, .29 + Math.sqrt(1 - t * t) * .17, .012));
    line(lash, rx * .017, '#695044');
    if (elderly) {
      line([at(side * .64, .22, .004), at(side * .72, .24, .004), at(side * .77, .22, .004)], .0018, '#c88f78');
      line([at(side * .65, .06, .004), at(side * .73, .03, .004)], .0015, '#c88f78');
    }
  }
  ball(at(0, -.11, .006), rx * .125, skin, [.8, .9, .8]);
  function patch(outline: THREE.Shape, color: string, lift: number) {
    const geometry = new THREE.ShapeGeometry(outline, 16);
    // Subdivide triangles before projection so the smile fits a curved cheek.
    const indexed = geometry.toNonIndexed(); geometry.dispose();
    const source = indexed.getAttribute('position'), points: number[] = [];
    const subdivide = (a: THREE.Vector2, b: THREE.Vector2, d: THREE.Vector2, depth: number) => {
      if (!depth) { for (const p of [a, b, d]) points.push(...at(p.x, p.y, lift)); return; }
      const ab = a.clone().add(b).multiplyScalar(.5), bd = b.clone().add(d).multiplyScalar(.5), da = d.clone().add(a).multiplyScalar(.5);
      subdivide(a, ab, da, depth - 1); subdivide(ab, b, bd, depth - 1);
      subdivide(da, bd, d, depth - 1); subdivide(ab, bd, da, depth - 1);
    };
    for (let i = 0; i < source.count; i += 3) subdivide(new THREE.Vector2(source.getX(i), source.getY(i)),
      new THREE.Vector2(source.getX(i + 1), source.getY(i + 1)), new THREE.Vector2(source.getX(i + 2), source.getY(i + 2)), 1);
    indexed.dispose();
    const result = new THREE.BufferGeometry(); result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    result.computeVertexNormals(); add(result, color);
  }
  const mouth = new THREE.Shape(); mouth.moveTo(-.28, -.38); mouth.quadraticCurveTo(0, -.46, .28, -.38);
  mouth.quadraticCurveTo(.20, -.67, 0, -.68); mouth.quadraticCurveTo(-.20, -.67, -.28, -.38); patch(mouth, '#853e43', .004);
  const teeth = new THREE.Shape(); teeth.moveTo(-.235, -.402); teeth.quadraticCurveTo(0, -.47, .235, -.402);
  teeth.lineTo(.18, -.49); teeth.quadraticCurveTo(0, -.56, -.18, -.49); teeth.closePath(); patch(teeth, '#fff9ef', .006);
  const tongue = new THREE.Shape(); tongue.moveTo(-.12, -.63); tongue.quadraticCurveTo(0, -.55, .12, -.63);
  tongue.quadraticCurveTo(0, -.68, -.12, -.63); patch(tongue, '#d88787', .007);
}
