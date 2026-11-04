import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roundedCharacterBox } from './characterGeometry.ts';

type Point = [number, number, number];
type Surface = 'skin' | 'cloth' | 'hair' | 'eyes' | 'metal' | 'leather';
type Profile = [height: number, width: number, depth: number];

// Original procedural character based on the supplied turnaround. Surfaces are
// merged by material, with smooth normals and vertex colours rather than textures.
export function createChairpersonModel() {
  const root = new THREE.Group(); root.name = 'chairperson-character';
  const skin = '#efba96', black = '#29282d', red = '#d94235';
  const materials: Record<Surface, THREE.MeshStandardMaterial> = {
    skin: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .56 }),
    cloth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88 }),
    hair: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .44, side: THREE.DoubleSide }),
    eyes: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .23 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .28, metalness: .65 }),
    leather: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .65 }),
  };
  const batches = new Map<Surface, THREE.BufferGeometry[]>();
  function add(source: THREE.BufferGeometry, color: string, position: Point = [0, 0, 0],
    scale: Point = [1, 1, 1], surface: Surface = 'skin', tint?: (p: THREE.Vector3, c: THREE.Color) => void) {
    const shape = source.index ? source.toNonIndexed() : source.clone(); source.dispose();
    shape.deleteAttribute('uv'); shape.scale(...scale); shape.translate(...position);
    const base = new THREE.Color(color), c = new THREE.Color(), p = new THREE.Vector3();
    const positions = shape.getAttribute('position'), colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      c.copy(base); p.fromBufferAttribute(positions, i); tint?.(p, c); c.toArray(colors, i * 3);
    }
    shape.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const batch = batches.get(surface) ?? []; batch.push(shape); batches.set(surface, batch);
  }
  function finish(parent: THREE.Group, prefix: string) {
    for (const [surface, shapes] of batches) {
      const geometry = mergeGeometries(shapes); shapes.forEach(shape => shape.dispose());
      const mesh = new THREE.Mesh(geometry, materials[surface]); mesh.name = `${prefix}-${surface}`;
      mesh.castShadow = true;
      // Fine hair ridges should catch light without a striped self-shadow pattern.
      mesh.receiveShadow = surface !== 'hair' && surface !== 'eyes'; parent.add(mesh);
    }
    batches.clear();
  }
  function ball(p: Point, radius: number, color: string, scale: Point = [1, 1, 1], surface: Surface = 'skin') {
    add(new THREE.SphereGeometry(radius, 20, 14), color, p, scale, surface);
  }
  function curve(points: Point[], radius: number, color: string, surface: Surface = 'skin') {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    add(new THREE.TubeGeometry(path, Math.max(12, points.length * 4), radius, 6, false), color, undefined, undefined, surface);
  }
  function limb(a: Point, b: Point, radius: number, color: string, endRadius = radius, surface: Surface = 'skin') {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), axis = end.clone().sub(start);
    const shape = new THREE.CylinderGeometry(endRadius, radius, axis.length(), 20);
    shape.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize()));
    add(shape, color, start.add(end).multiplyScalar(.5).toArray() as Point, undefined, surface);
  }
  // Continuous tailored silhouettes remove stacked primitive seams.
  function garment(profile: Profile[], x: number, color: string, surface: Surface = 'cloth', z = 0) {
    const vertices: number[] = [], indices: number[] = [], segments = 32;
    for (const [y, width, depth] of profile) for (let j = 0; j <= segments; j++) {
      const a = j / segments * Math.PI * 2;
      vertices.push(x + Math.sin(a) * width, y, z + Math.cos(a) * depth);
    }
    for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j, b = a + segments + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const shape = new THREE.BufferGeometry(); shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    shape.setIndex(indices); shape.computeVertexNormals(); add(shape, color, undefined, undefined, surface);
  }
  function ovalRing(p: Point, radius: number, thickness: number, scale: Point, color: string, surface: Surface) {
    add(new THREE.TorusGeometry(radius, thickness, 8, 40), color, p, scale, surface);
  }

  // Beige ballet flats with piping, stitched sole and a small woven pattern.
  for (const side of [-1, 1]) {
    const x = side * .12;
    ball([x, .036, .057], .10, '#9e8061', [.92, .30, 1.65], 'leather');
    ball([x, .065, .057], .10, '#cfb08a', [.91, .48, 1.62], 'leather');
    limb([x, .075, -.008], [x, .19, -.008], .056, skin);
    ovalRing([x, .102, -.002], .053, .006, [1, .46, 1], '#a98b68', 'leather');
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const px = x - .047 + col * .045, pz = .087 + row * .036;
      curve([[px - .012, .098 - row * .006, pz], [px, .107 - row * .006, pz + .009],
        [px + .012, .098 - row * .006, pz]], .0022, '#ac8b66', 'leather');
    }
    garment([[.16, .081, .080], [.185, .083, .082], [.32, .086, .088], [.46, .094, .096],
      [.59, .105, .107], [.73, .112, .118], [.79, .105, .11]], x, red);
    curve([[x, .19, .083], [x, .42, .098], [x, .60, .109]], .0022, '#e45a45', 'cloth');
    curve([[x - .07, .183, .04], [x, .18, .083], [x + .07, .183, .04]], .002, '#b73530', 'cloth');
  }
  garment([[.68, .19, .116], [.73, .224, .133], [.79, .225, .139], [.825, .208, .13]], 0, red);
  curve([[-.19, .782, .076], [-.145, .735, .118], [-.126, .69, .115]], .003, '#b3332c', 'cloth');
  curve([[.19, .782, .076], [.145, .735, .118], [.126, .69, .115]], .003, '#b3332c', 'cloth');
  curve([[0, .79, .143], [0, .75, .143], [.008, .71, .132]], .0025, '#b3332c', 'cloth');
  for (const side of [-1, 1]) {
    curve([[side * .04, .77, -.133], [side * .15, .765, -.116], [side * .15, .69, -.117],
      [side * .09, .667, -.127], [side * .04, .69, -.133], [side * .04, .77, -.133]], .0025, '#b3332c', 'cloth');
  }

  // Fitted tee, curved shoulders, neckline and twin-needle hem.
  garment([[.80, .194, .13], [.815, .196, .133], [.87, .184, .129], [.95, .187, .136],
    [1.03, .211, .145], [1.105, .224, .137], [1.15, .198, .115], [1.175, .105, .080], [1.18, .079, .072]], 0, black);
  curve([[-.18, .815, .052], [-.12, .812, .115], [0, .812, .134], [.12, .812, .115], [.18, .815, .052]], .002, '#4c474b', 'cloth');
  limb([0, 1.16, 0], [0, 1.31, 0], .072, skin);
  curve([[-.083, 1.177, .029], [-.062, 1.167, .065], [0, 1.161, .079], [.062, 1.167, .065], [.083, 1.177, .029]], .009, '#39363b', 'cloth');
  ball([.211, 1.095, 0], .079, black, [1, 1.05, 1], 'cloth');
  limb([.216, 1.11, 0], [.261, 1.015, .008], .074, black, .071, 'cloth');
  limb([.255, 1.02, .01], [.279, .88, .025], .047, skin, .042);
  ball([.279, .879, .025], .043, skin);
  limb([.279, .88, .025], [.282, .734, .035], .042, skin, .032);
  ball([.283, .689, .04], .045, skin, [.75, 1.24, .68]);
  for (let i = 0; i < 4; i++) limb([.26 + i * .012, .68, .056], [.262 + i * .012, .639 + Math.abs(i - 1.5) * .006, .06], .0085, skin);
  ball([.251, .695, .062], .018, skin, [.65, 1.4, .8]);
  // Rounded watch case, inset glass, band and crown.
  limb([.282, .75, .035], [.282, .785, .035], .038, '#e8dfd3', .038, 'leather');
  add(roundedCharacterBox([.084, .065, .025]), '#c9cbd0', [.282, .769, .067], undefined, 'metal');
  add(roundedCharacterBox([.067, .048, .008]), '#252931', [.282, .769, .083], undefined, 'eyes');
  curve([[.264, .78, .085], [.271, .788, .085], [.294, .784, .085]], .002, '#8998a0', 'eyes');
  ball([.325, .771, .069], .007, '#d2d3d6', [1, 1, 1], 'metal');

  // Blush is blended into face vertices, avoiding stuck-on discs.
  const blush = new THREE.Color('#e99c92');
  add(new THREE.SphereGeometry(1, 48, 36), skin, [0, 1.49, .035], [.241, .255, .209], 'skin', (p, c) => {
    const weight = Math.exp(-((Math.abs(p.x) - .133) ** 2 / .0018 + (p.y - 1.414) ** 2 / .001)) * Math.max(0, p.z / .22);
    c.lerp(blush, weight * .55);
  });
  const faceZ = (x: number, y: number) => .035 + .209 * Math.sqrt(Math.max(.01, 1 - (x / .241) ** 2 - ((y - 1.49) / .255) ** 2));
  for (const side of [-1, 1]) {
    ball([side * .233, 1.467, .024], .038, skin, [.6, 1.2, .9]);
    ball([side * .244, 1.467, .045], .021, '#d9997f', [.3, 1, .8]);
    const x = side * .087, y = 1.514, z = faceZ(x, y);
    ball([x, y, z], .055, '#fff9ed', [1, 1.16, .38], 'eyes');
    ball([x, y - .003, z + .019], .037, '#80543a', [1, 1.16, .25], 'eyes');
    ball([x, y - .003, z + .027], .025, '#302427', [1, 1.18, .16], 'eyes');
    ball([x - .011, y + .017, z + .033], .0115, '#ffffff', [1, 1, .45], 'eyes');
    ball([x + .013, y - .021, z + .032], .0045, '#fff1d5', [1, 1, .5], 'eyes');
    const lash: Point[] = [-1, -.5, 0, .5, 1].map(t => {
      const px = x + t * .051, py = y + .025 + Math.sqrt(1 - t * t) * .035;
      return [px, py, faceZ(px, py) + .013];
    });
    curve(lash, .0045, '#44332f', 'hair');
    const outer = side * .134;
    curve([[outer, 1.537, faceZ(outer, 1.537) + .012],
      [outer + side * .012, 1.547, faceZ(outer, 1.537) + .013]], .003, '#44332f', 'hair');
    curve([[side * .048, 1.603, faceZ(side * .048, 1.603) + .006],
      [side * .084, 1.619, faceZ(side * .084, 1.619) + .006],
      [side * .123, 1.606, faceZ(side * .123, 1.606) + .006]], .010, '#655044', 'hair');
  }
  ball([0, 1.444, .242], .030, '#f2c19e', [.73, .92, .85]);
  // Curved smile and teeth conform to the cheek surface.
  function smile(shape: THREE.Shape, color: string, offset: number) {
    const geometry = new THREE.ShapeGeometry(shape, 20), positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) positions.setZ(i, faceZ(positions.getX(i), positions.getY(i)) + offset);
    geometry.computeVertexNormals(); add(geometry, color, undefined, undefined, 'eyes');
  }
  const mouth = new THREE.Shape(); mouth.moveTo(-.066, 1.391);
  mouth.quadraticCurveTo(0, 1.372, .066, 1.391); mouth.quadraticCurveTo(.048, 1.325, 0, 1.323);
  mouth.quadraticCurveTo(-.048, 1.325, -.066, 1.391); smile(mouth, '#873c3d', .004);
  const teeth = new THREE.Shape(); teeth.moveTo(-.054, 1.385);
  teeth.quadraticCurveTo(0, 1.369, .054, 1.385); teeth.lineTo(.042, 1.366);
  teeth.quadraticCurveTo(0, 1.349, -.042, 1.366); teeth.closePath(); smile(teeth, '#fff9ed', .006);
  const tongue = new THREE.Shape(); tongue.moveTo(-.026, 1.33);
  tongue.quadraticCurveTo(0, 1.351, .026, 1.33); tongue.quadraticCurveTo(0, 1.321, -.026, 1.33);
  smile(tongue, '#d88481', .007);
  curve([[-.06, 1.387, faceZ(-.06, 1.387) + .006], [0, 1.378, faceZ(0, 1.378) + .006],
    [.06, 1.387, faceZ(.06, 1.387) + .006]], .0022, '#b76a65', 'skin');

  // Continuous bob shell with swept strands and silver-to-honey shading.
  const hairPoint = (phi: number, t: number, lift = 0): Point => {
    const wrap = Math.abs(Math.atan2(Math.sin(phi), Math.cos(phi)));
    const blend = THREE.MathUtils.smoothstep(wrap, .25, 1.35);
    const theta = t * (.93 + 1.35 * blend);
    const width = theta > Math.PI / 2 ? 1 - (theta - Math.PI / 2) * .08 : Math.sin(theta);
    return [Math.sin(phi) * (.298 + lift) * width,
      1.50 + (.325 + lift) * Math.cos(theta), -.035 + Math.cos(phi) * (.247 + lift) * width];
  };
  const positions: number[] = [], indices: number[] = [], rows = 28, columns = 80;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++) positions.push(...hairPoint(j / columns * Math.PI * 2, Math.max(.001, i / rows)));
  for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) {
    const a = i * (columns + 1) + j, b = a + columns + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const shell = new THREE.BufferGeometry(); shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shell.setIndex(indices); shell.computeVertexNormals();
  const honey = new THREE.Color('#c39b67'), ash = new THREE.Color('#c4bcb2');
  add(shell, '#c4bcb2', undefined, undefined, 'hair', (p, c) => {
    c.copy(ash).lerp(honey, THREE.MathUtils.smoothstep(1.75 - p.y, .02, .43));
  });
  for (let i = 0; i < 36; i++) {
    const phi = i / 36 * Math.PI * 2;
    curve(Array.from({ length: 9 }, (_, j) => hairPoint(phi + Math.sin(j / 8 * Math.PI) * .085, .12 + j / 8 * .875, .002)),
      i % 3 === 0 ? .0018 : .0011, i % 3 === 0 ? '#cfc4b3' : '#b7a58b', 'hair');
  }
  // Soft locks sweep away from a side part rather than bead-like bangs.
  for (let i = 0; i < 11; i++) {
    const offset = i * .008;
    curve([[.10, 1.805 - offset * .65, .10 + offset * .5],
      [-.04, 1.78 - offset, .195 + offset * .35],
      [-.185, 1.69 - offset, .19 + offset * .2],
      [-.258, 1.50 + offset * .55, .09]],
    .009, i % 3 === 0 ? '#d8cfc2' : i % 3 === 1 ? '#bfb3a4' : '#cec2ae', 'hair');
  }
  for (let i = 0; i < 7; i++) {
    const offset = i * .007;
    curve([[.112, 1.79 - offset, .115 + offset], [.213, 1.705 - offset, .138 + offset * .5],
      [.268, 1.55 - offset, .045], [.26, 1.345 + offset, .032]],
    .008, i % 2 ? '#c1af94' : '#d1c3aa', 'hair');
  }
  finish(root, 'chairperson-body');

  // Rounded elbow, separate folded fingers and tapered V-sign fingertips.
  ball([-.21, 1.095, 0], .079, black, [1, 1.05, 1], 'cloth');
  limb([-.216, 1.11, 0], [-.278, 1.014, .008], .074, black, .069, 'cloth');
  limb([-.278, 1.02, .008], [-.357, 1.055, .045], .047, skin, .044);
  ball([-.357, 1.055, .045], .044, skin);
  limb([-.357, 1.055, .045], [-.405, 1.31, .10], .044, skin, .033);
  ball([-.414, 1.354, .108], .058, skin, [.8, 1.14, .55]);
  const fingers: [Point, Point, Point][] = [
    [[-.438, 1.389, .108], [-.465, 1.447, .106], [-.482, 1.505, .107]],
    [[-.407, 1.398, .108], [-.398, 1.462, .108], [-.389, 1.523, .109]],
  ];
  for (const [a, b, c] of fingers) {
    limb(a, b, .016, skin, .014); ball(b, .014, skin); limb(b, c, .014, skin, .0115); ball(c, .0115, skin);
    ball([c[0], c[1] - .008, c[2] + .010], .008, '#f7d4bc', [.65, 1.3, .22]);
  }
  for (let i = 0; i < 2; i++) {
    ball([-.396 + i * .022, 1.351, .139], .019, skin, [.85, 1.12, .8]);
    curve([[-.407 + i * .022, 1.35, .148], [-.397 + i * .022, 1.338, .154], [-.389 + i * .022, 1.343, .147]], .0015, '#ce997d');
  }
  curve([[-.448, 1.35, .132], [-.435, 1.326, .15], [-.407, 1.33, .155]], .017, skin);
  const greeting = new THREE.Group(); greeting.name = 'chairperson-greeting';
  finish(greeting, 'chairperson-peace-hand');
  for (const mesh of greeting.children) (mesh as THREE.Mesh).geometry.translate(.205, -1.13, 0);
  greeting.position.set(-.205, 1.13, 0); root.add(greeting);
  return { root, greeting };
}
