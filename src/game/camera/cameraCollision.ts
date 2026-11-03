type Point3 = { x: number; y: number; z: number };
export type CameraBlocker = { min: Point3; max: Point3 };
const axes = ['x', 'y', 'z'] as const;

// A padded segment/AABB test approximates camera volume without raycasting every mesh.
export function constrainCamera(focus: Point3, position: Point3, blockers: readonly CameraBlocker[], radius = 0.4) {
  const length = Math.hypot(position.x - focus.x, position.y - focus.y, position.z - focus.z);
  if (length < 0.00001) return false;
  let nearest = 1;
  for (const blocker of blockers) {
    let near = 0, far = 1;
    for (const axis of axes) {
      const origin = focus[axis], direction = position[axis] - origin;
      const min = blocker.min[axis] - radius, max = blocker.max[axis] + radius;
      if (Math.abs(direction) < 0.000001) {
        if (origin < min || origin > max) { near = Infinity; break; }
        continue;
      }
      const a = (min - origin) / direction, b = (max - origin) / direction;
      near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
      if (near > far) break;
    }
    if (near <= far && near >= 0 && near < nearest) nearest = near;
  }
  if (nearest >= 1) return false;
  const t = Math.max(0, nearest - 0.15 / length);
  position.x = focus.x + (position.x - focus.x) * t;
  position.y = focus.y + (position.y - focus.y) * t;
  position.z = focus.z + (position.z - focus.z) * t;
  return true;
}
