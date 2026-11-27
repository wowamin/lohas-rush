import { Vector3 } from 'three';
import { MouseOrbit } from '../../game/camera/MouseOrbit.ts';

export const INTERIOR_AIM_HEIGHT = 1.15;
const limitDistance = (orbit: MouseOrbit) => { orbit.radius = Math.min(14, orbit.radius); };

export function cameraRelativeMovement(dx: number, dz: number, yaw: number) {
  return { x: dx * Math.cos(yaw) + dz * Math.sin(yaw), z: dz * Math.cos(yaw) - dx * Math.sin(yaw) };
}

// Reuse the city's orbit math, with input bound only to the interior canvas.
// A fixed target heading keeps looking around independent from grandma's turns.
export function bindInteriorOrbit(canvas: HTMLCanvasElement, orbit: MouseOrbit, view: () => { position: Vector3; x: number; z: number }, enabled: () => boolean) {
  const pointers = new Map<number, { x: number; y: number }>();
  const continuation = new Vector3();
  let pinch = 0;
  const distance = () => { const [a, b] = [...pointers.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
  const begin = (point: { x: number; y: number }, preserveView = false) => {
    const current = view();
    const target = { x: current.x, z: current.z, angle: 0, speed: 0 };
    // Lifting one pinch finger resumes a drag. Keep the requested orbit rather
    // than sampling the still-damping (or collision-shortened) camera position.
    if (preserveView && orbit.active) orbit.apply(continuation, target, INTERIOR_AIM_HEIGHT);
    orbit.begin(preserveView && orbit.active ? continuation : current.position, target, INTERIOR_AIM_HEIGHT, point.x, point.y);
    limitDistance(orbit);
  };
  const zoom = (delta: number) => {
    const current = view();
    orbit.zoom(delta, current.position, { x: current.x, z: current.z, angle: 0, speed: 0 }, INTERIOR_AIM_HEIGHT);
    limitDistance(orbit);
  };
  const release = () => {
    const ids = [...pointers.keys()]; pointers.clear(); pinch = 0; orbit.end(); canvas.classList.remove('is-orbiting');
    for (const id of ids) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  const down = (event: PointerEvent) => {
    if (!enabled() || (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2) || pointers.size >= 2) return;
    event.preventDefault();
    const point = { x: event.clientX, y: event.clientY }; pointers.set(event.pointerId, point);
    canvas.setPointerCapture(event.pointerId); canvas.classList.add('is-orbiting');
    if (pointers.size === 1) begin(point); else { orbit.end(); pinch = distance(); }
  };
  const move = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    if (!enabled() || (event.pointerType === 'mouse' && !(event.buttons & 3))) { release(); return; }
    event.preventDefault(); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) orbit.move(event.clientX, event.clientY);
    else {
      const next = distance();
      if (pinch > 0 && next > 0) zoom(Math.log(pinch / next) / .0015);
      pinch = next;
    }
  };
  const up = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (pointers.size === 1 && enabled()) { pinch = 0; begin([...pointers.values()][0], true); }
    else if (!pointers.size) release();
  };
  const cancel = (event: PointerEvent) => { if (pointers.has(event.pointerId)) release(); };
  const wheel = (event: WheelEvent) => {
    if (!enabled() || event.ctrlKey || !event.deltaY) return;
    event.preventDefault(); zoom(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1));
  };
  const menu = (event: Event) => event.preventDefault();
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('lostpointercapture', cancel);
  canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('contextmenu', menu);
  window.addEventListener('blur', release); window.addEventListener('resize', release); document.addEventListener('visibilitychange', release);
  return () => {
    release();
    canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('lostpointercapture', cancel);
    canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('contextmenu', menu);
    window.removeEventListener('blur', release); window.removeEventListener('resize', release); document.removeEventListener('visibilitychange', release);
  };
}
