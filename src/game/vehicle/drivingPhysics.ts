import { collides } from '../collision/collisionSystem.ts';
export type DrivingInput = { throttle: number; steer: number; brake: boolean };
export type VehicleState = { x: number; z: number; angle: number; speed: number };
export const STEP = 1 / 120;
export const MAX_SUBSTEPS = 12;
export const createVehicle = (): VehicleState => ({ x: 0, z: 12, angle: 0, speed: 0 });
export function stepVehicle(s: VehicleState, input: DrivingInput, dt = STEP) {
  s.speed += input.throttle * (input.throttle * s.speed < 0 ? 25 : 13) * dt;
  s.speed *= Math.exp(-(input.brake ? 10 : input.throttle ? 0.45 : 1.7) * dt);
  s.speed = Math.max(-8, Math.min(18, s.speed));
  if (Math.abs(s.speed) < 0.015) s.speed = 0;
  const angle = s.angle + input.steer * Math.sign(s.speed) * Math.min(Math.abs(s.speed) / 6, 1) * 1.55 * dt;
  const x = s.x - Math.sin(angle) * s.speed * dt;
  const z = s.z - Math.cos(angle) * s.speed * dt;
  if (collides(x, z)) s.speed = 0;
  else { s.x = x; s.z = z; s.angle = angle; }
}
