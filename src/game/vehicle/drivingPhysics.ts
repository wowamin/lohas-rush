import { collides } from '../collision/collisionSystem.ts';
import { SPAWN } from '../../data/roadNetwork.ts';
export type DrivingInput = { throttle: number; steer: number; brake: boolean };
export type VehicleState = { x: number; z: number; angle: number; speed: number };
export const STEP = 1 / 120;
export const MAX_SUBSTEPS = 12;
export const createVehicle = (): VehicleState => ({ ...SPAWN });
// Render between completed simulation steps without changing collision/mission state.
export function interpolateVehicle(previous: VehicleState, current: VehicleState, alpha: number, output: VehicleState) {
  const t = Math.max(0, Math.min(1, alpha));
  output.x = previous.x + (current.x - previous.x) * t;
  output.z = previous.z + (current.z - previous.z) * t;
  output.angle = previous.angle + (current.angle - previous.angle) * t;
  output.speed = previous.speed + (current.speed - previous.speed) * t;
}
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
