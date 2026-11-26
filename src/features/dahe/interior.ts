import { Group } from 'three';
import { StreetNavigation } from '../../game/streets/StreetNavigation.ts';

// A fictional, playable arrangement inspired by the supplied environment photos.
// Units and entrances are design choices, not surveyed dimensions.
export type ZoneId = 'reception' | 'activity' | 'rest' | 'kitchen' | 'rehab';
export const PREVIEW_KEY = 'lohas-rush:dahe-preview:v1';
export const PLAYER_RADIUS = .44; // Covers grandma and her existing wheelchair at scale .9.
export const ROOM = { halfX: 11, halfZ: 7 };
export const START = { x: 0, z: 5.7, angle: Math.PI };
export const TABLE_POSITIONS = [[-3.2, -.9], [3.2, -.9], [-3.2, 2.4], [3.2, 2.4]] as const;
export const ZONES = [
  { id: 'reception', name: '迎賓接待', title: '從一聲問候開始', point: [0, 4.6], color: '#c8a4bd', text: '在入口停一停，想像自己第一次來到這裡。這段散策從熟悉環境開始。' },
  { id: 'activity', name: '共聚活動', title: '一起圍坐的日常', point: [0, 0], color: '#b09a65', text: '木桌和深色座椅圍出共享的活動空間。留出的中央走道，讓參觀時可以自在穿行。' },
  { id: 'rest', name: '悠閒休憩', title: '留一點時間慢下來', point: [7.2, -1.3], color: '#a389b5', text: '參考照片裡的深色休閒椅與藍色捲簾，這裡安排一個安靜角落，也放入按摩椅的簡化造型。' },
  { id: 'kitchen', name: '溫暖備餐', title: '看見生活的細節', point: [-5.8, -3.7], color: '#869e6b', text: '淺木櫃、白色檯面、水槽和冰箱，取材自你提供的環境照片；位置為遊戲安排。' },
  { id: 'rehab', name: '扶手練習', title: '每一步都可以從容', point: [-7.4, 2.5], color: '#699aab', text: '窗邊的平行扶手是照片中的空間特色。此處僅供參觀互動，未模擬療程或提供訓練指引。' },
] as const;
export type InteriorBox = { id: string; position: [number, number, number]; size: [number, number, number]; color: string; solid?: boolean };
const boxes: InteriorBox[] = [];
function box(id: string, position: InteriorBox['position'], size: InteriorBox['size'], color: string, solid = true) {
  boxes.push({ id, position, size, color, solid });
}
box('floor', [0, -.13, 0], [22.2, .24, 14.2], '#e9e6dc', false);
box('back-wall', [0, 1.65, -7], [22.2, 3.3, .18], '#d8b5d0');
box('west-wall', [-11, 1.65, 0], [.18, 3.3, 14], '#bbd59c');
box('east-wall', [11, 1.65, 0], [.18, 3.3, 14], '#add5df');
// Low front walls make the room readable from the third-person cutaway view.
box('front-left', [-6.3, .3, 7], [9.4, .6, .18], '#d8b5d0');
box('front-right', [6.3, .3, 7], [9.4, .6, .18], '#add5df');
box('welcome-mat', [0, .01, 5.5], [2.6, .03, 2], '#a8c5b6', false);
box('reception-desk', [3.3, .52, 5.6], [2.3, 1.04, .85], '#d4bb93');
box('reception-top', [3.3, 1.08, 5.6], [2.5, .12, 1], '#faf4df');
for (const x of [-8.5, -3, 3, 8.2]) {
  box(`window-${x}`, [x, 2, -6.88], [3.5, 1.8, .06], '#b7dae1', false);
  box(`blind-${x}`, [x, 2.65, -6.82], [3.6, .65, .1], '#91bacd', false);
  for (const dx of [-1.8, 0, 1.8]) box(`frame-${x}-${dx}`, [x + dx, 1.95, -6.76], [.055, 1.85, .07], '#3e5557', false);
  box(`sill-${x}`, [x, 1.04, -6.76], [3.7, .08, .16], '#faf3df', false);
}
for (const [i, [x, z]] of TABLE_POSITIONS.entries()) {
  box(`table-${i}`, [x, .78, z], [2.15, .13, 1.05], '#dfc79f');
  for (const dx of [-.85, .85]) for (const dz of [-.36, .36]) box(`leg-${i}-${dx}-${dz}`, [x + dx, .37, z + dz], [.09, .74, .09], '#bca37a');
  for (const [j, dz] of [-.98, .98].entries()) for (const [k, dx] of [-.57, .57].entries()) {
    box(`chair-${i}-${j}-${k}`, [x + dx, .45, z + dz], [.55, .12, .55], '#35464b');
    box(`chair-back-${i}-${j}-${k}`, [x + dx, .8, z + dz + Math.sign(dz) * .22], [.55, .62, .08], '#35464b');
    for (const lx of [-.2, .2]) box(`chair-leg-${i}-${j}-${k}-${lx}`, [x + dx + lx, .21, z + dz], [.06, .42, .42], '#c4ae89');
  }
}
box('kitchen-base', [-5.7, .52, -5.8], [6.2, 1.04, .9], '#cbb28c');
box('kitchen-top', [-5.7, 1.09, -5.8], [6.4, .1, 1.02], '#fff8e8');
for (const x of [-8, -6.5, -5, -3.5]) box(`cupboard-line-${x}`, [x, .52, -5.335], [.024, .93, .015], '#ad997c', false);
box('sink', [-5.3, 1.15, -5.8], [.9, .035, .56], '#7c9293', false);
box('tap', [-5.3, 1.38, -6], [.07, .48, .07], '#879da0', false);
box('fridge', [-9.8, 1.18, -5.8], [1.1, 2.36, 1.15], '#85999b');
box('fridge-handle', [-9.42, 1.3, -5.2], [.05, .65, .08], '#dce7df', false);
box('microwave', [-3.4, 1.38, -5.85], [.65, .48, .48], '#45565b', false);
box('rice-cooker', [-7.4, 1.35, -5.8], [.45, .42, .42], '#b75f46', false);
// Scale the whole chair around its ground anchor so the parts stay connected.
// Rendering, walking collision and camera blockers all read these same boxes.
function seatPart(id: string, anchor: [number, number], offset: InteriorBox['position'], size: InteriorBox['size'], color: string) {
  const scale = .5;
  box(id, [anchor[0] + offset[0] * scale, offset[1] * scale, anchor[1] + offset[2] * scale],
    [size[0] * scale, size[1] * scale, size[2] * scale], color);
}
for (const x of [5.4, 7.3, 9.2]) {
  const anchor: [number, number] = [x, -4.9];
  seatPart(`recliner-seat-${x}`, anchor, [0, .44, 0], [1.25, .65, 1.15], '#39434b');
  seatPart(`recliner-back-${x}`, anchor, [0, 1, -.5], [1.25, 1.3, .32], '#39434b');
  seatPart(`recliner-foot-${x}`, anchor, [0, .29, .73], [1, .3, .65], '#48545b');
  for (const dx of [-.61, .61]) seatPart(`recliner-arm-${x}-${dx}`, anchor, [dx, .65, .05], [.18, .37, 1.2], '#48545b');
}
const massageAnchor: [number, number] = [9.2, -1.7];
seatPart('massage-base', massageAnchor, [0, .4, 0], [1.35, .65, 1.7], '#344955');
seatPart('massage-back', massageAnchor, [0, 1.1, -.6], [1.4, 1.45, .42], '#344955');
for (const dx of [-.65, .65]) seatPart(`massage-arm-${dx}`, massageAnchor, [dx, .82, 0], [.26, .65, 1.55], '#526d78');
box('locker', [9.9, 1.2, 3.8], [1.15, 2.4, 2.5], '#d4bd98');
for (const z of [3, 3.8, 4.6]) for (const y of [.4, 1.2, 2]) box(`locker-knob-${z}-${y}`, [9.3, y, z], [.06, .08, .08], '#7a7566', false);
box('rail-mat', [-7.4, .014, 2.5], [4, .03, 1.8], '#8cbbc4', false);
for (const z of [1.85, 3.15]) {
  box(`rail-${z}`, [-7.4, .95, z], [3.6, .075, .075], '#8c9d9c');
  for (const x of [-9.1, -5.7]) box(`rail-post-${x}-${z}`, [x, .47, z], [.07, .94, .07], '#8c9d9c');
}
// A simplified bathroom alcove, with a clear opening toward the central aisle.
box('bathroom-wall', [-9.25, 1.2, 4.2], [3.5, 2.4, .12], '#c2d6ac');
box('bathroom-side', [-6, 1.2, 5.65], [.12, 2.4, 2.9], '#c2d6ac');
box('bathroom-seat', [-9.2, .42, 5.9], [.55, .7, .8], '#f6f4e9');
box('bathroom-cistern', [-9.2, .85, 6.3], [.6, .85, .22], '#f6f4e9');
box('bathroom-grab-bar', [-10, .85, 5.9], [.07, .07, 1.2], '#8c9d9c');
box('plant-pot', [6.9, .26, 5.65], [.65, .52, .65], '#d0b798');
box('plant-leaves', [6.9, .95, 5.65], [.8, .95, .8], '#8ea77c');
export const INTERIOR_BOXES: readonly InteriorBox[] = boxes;
export const BLOCKERS = boxes.filter(item => item.solid).map(item => ({
  id: item.id,
  min: { x: item.position[0] - item.size[0] / 2, y: item.position[1] - item.size[1] / 2, z: item.position[2] - item.size[2] / 2 },
  max: { x: item.position[0] + item.size[0] / 2, y: item.position[1] + item.size[1] / 2, z: item.position[2] + item.size[2] / 2 },
}));
const navigation = new StreetNavigation(new Group());
for (const box of boxes.filter(item => item.solid)) navigation.add({
  id: box.id, x: box.position[0], z: box.position[2], halfX: box.size[0] / 2, halfZ: box.size[2] / 2, yaw: 0, blocks: ['pedestrian'],
});
export function blocked(x: number, z: number) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) + PLAYER_RADIUS > ROOM.halfX - .1 || Math.abs(z) + PLAYER_RADIUS > ROOM.halfZ - .1) return true;
  return navigation.collides(x, z, PLAYER_RADIUS, 'pedestrian');
}
export function nearZone(x: number, z: number): ZoneId | null {
  return ZONES.find(zone => Math.hypot(x - zone.point[0], z - zone.point[1]) < 1.65)?.id ?? null;
}
export function stepWalker(player: { x: number; z: number; angle: number }, dx: number, dz: number, fast: boolean, dt: number) {
  const length = Math.hypot(dx, dz);
  if (!length) return;
  const step = (fast ? 3.2 : 2.2) * Math.min(Math.max(dt, 0), 1 / 60) / length;
  const x = player.x + dx * step, z = player.z + dz * step;
  if (!blocked(x, player.z) && !navigation.sweep(player.x, player.z, x, player.z, PLAYER_RADIUS, 'pedestrian')) player.x = x;
  if (!blocked(player.x, z) && !navigation.sweep(player.x, player.z, player.x, z, PLAYER_RADIUS, 'pedestrian')) player.z = z;
  player.angle = Math.atan2(dx, dz);
}
export function parseProgress(raw: string | null): { completed: number; writable: boolean } {
  if (!raw) return { completed: 0, writable: true };
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === 'object' && value.version !== undefined && value.version !== 1) return { completed: 0, writable: false };
    if (value?.version === 1 && Number.isInteger(value.completed) && value.completed >= 0 && value.completed <= ZONES.length) return { completed: value.completed, writable: true };
  } catch { /* Invalid data can be replaced with a fresh preview. */ }
  return { completed: 0, writable: true };
}
