import { Vector3 } from 'three';
import type { VehicleState } from '../vehicle/drivingPhysics.ts';
import { selectVirtualCamera, type CameraMode, type VirtualCamera } from './virtualCameras.ts';
import { constrainCamera, type CameraBlocker } from './cameraCollision.ts';
import { MouseOrbit } from './MouseOrbit.ts';

type Rig = Pick<VirtualCamera, 'distance' | 'height' | 'shoulder' | 'fov' | 'lookAhead' | 'lookAheadTime' | 'aimHeight'>;
const rigKeys = ['distance', 'height', 'shoulder', 'fov', 'lookAhead', 'lookAheadTime', 'aimHeight'] as const;
const damp = (current: number, desired: number, seconds: number, dt: number) => current + (desired - current) * (seconds <= 0 ? 1 : 1 - Math.exp(-dt / seconds));

// A web camera brain: virtual rigs describe the shot; only this output drives Three's camera.
export class CameraBrain {
  readonly orbit=new MouseOrbit();
  readonly position = new Vector3();
  readonly lookAt = new Vector3();
  fov = 58;
  private live = selectVirtualCamera('chase');
  private rig: Rig = { ...this.live };
  private blendFrom: Rig = { ...this.rig };
  private blendElapsed = 0;
  private initialized = false;
  private desiredPosition = new Vector3();
  private desiredLookAt = new Vector3();
  private focus = new Vector3();
  private previousPosition = new Vector3();

  get activeId() { return this.live.id; }
  get aimHeight() { return this.rig.aimHeight; }
  private compose(target: VehicleState) {
    const sin = Math.sin(target.angle), cos = Math.cos(target.angle);
    const ahead = this.rig.lookAhead + Math.max(-2, Math.min(2, target.speed * this.rig.lookAheadTime));
    this.desiredPosition.set(target.x + sin * this.rig.distance + cos * this.rig.shoulder, this.rig.height, target.z + cos * this.rig.distance - sin * this.rig.shoulder);
    this.desiredLookAt.set(target.x - sin * ahead, this.rig.aimHeight, target.z - cos * ahead);
    if(this.orbit.active){
      this.orbit.apply(this.desiredPosition,target,this.rig.aimHeight);
      this.desiredLookAt.set(target.x,this.rig.aimHeight,target.z);
    }
    this.focus.set(target.x, this.live.id === 'wheelchair' ? 1 : 1.8, target.z);
  }
  reset(target: VehicleState, mode: CameraMode = 'chase') {
    this.orbit.reset();
    this.live = selectVirtualCamera(mode);
    this.rig = { ...this.live }; this.blendFrom = { ...this.rig }; this.blendElapsed = this.live.blendDuration;
    this.compose(target); this.position.copy(this.desiredPosition); this.lookAt.copy(this.desiredLookAt);
    this.fov = this.rig.fov; this.initialized = true;
  }
  update(target: VehicleState, delta: number, mode: CameraMode, blockers: readonly CameraBlocker[] = [], resolvePosition?: (position: Vector3) => void) {
    if (!this.initialized) this.reset(target, mode);
    const dt = Math.max(0, Math.min(delta, 0.1));
    const live = selectVirtualCamera(mode);
    if (live.id !== this.live.id) {
      this.orbit.reset();
      this.blendFrom = { ...this.rig }; this.blendElapsed = 0; this.live = live;
    }
    this.blendElapsed += dt;
    const t = this.live.blendDuration <= 0 ? 1 : Math.min(1, this.blendElapsed / this.live.blendDuration);
    const blend = t * t * (3 - 2 * t);
    for (const key of rigKeys) this.rig[key] = this.blendFrom[key] + (this.live[key] - this.blendFrom[key]) * blend;
    this.compose(target);
    // Resolve the destination before damping, without teleporting the output.
    resolvePosition?.(this.desiredPosition);
    const damping = this.live.damping;
    this.previousPosition.copy(this.position);
    this.position.x = damp(this.position.x, this.desiredPosition.x, damping.x, dt);
    this.position.y = damp(this.position.y, this.desiredPosition.y, damping.y, dt);
    this.position.z = damp(this.position.z, this.desiredPosition.z, damping.z, dt);
    // A newly released alternate shoulder may be on the opposite side. Bound
    // travel during wheelchair turns so a valid blend still feels gradual.
    if(this.live.id==='wheelchair'){
      const travel=this.previousPosition.distanceTo(this.position),limit=8*dt;
      if(travel>limit)this.position.lerpVectors(this.previousPosition,this.position,limit/travel);
    }
    this.lookAt.lerp(this.desiredLookAt, damping.aim <= 0 ? 1 : 1 - Math.exp(-dt / damping.aim));
    // Pull inward immediately when obstructed; normal body damping controls the return outward.
    constrainCamera(this.focus, this.position, blockers);
    this.fov = this.rig.fov;
  }
}
