import { useRef, useState, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { buildings, fountain } from '../../data/city';
import { mountains } from '../../data/landscape';
import { useGame } from '../../stores/game';
import type { VehicleState } from '../vehicle/drivingPhysics';
import { CameraBrain } from './CameraBrain';
import type { CameraBlocker } from './cameraCollision';

const blockers: CameraBlocker[] = [
  ...buildings.map(b => ({ min: { x: b.x - b.halfX, y: 0, z: b.z - b.halfZ }, max: { x: b.x + b.halfX, y: b.height + 0.65, z: b.z + b.halfZ } })),
  ...mountains.map(m => ({ min: { x: m.x - m.radius, y: 0, z: m.z - m.radius }, max: { x: m.x + m.radius, y: m.height, z: m.z + m.radius } })),
  { min: { x: fountain.x - fountain.radius, y: 0, z: fountain.z - fountain.radius }, max: { x: fountain.x + fountain.radius, y: 0.8, z: fountain.z + fountain.radius } },
];
export function VehicleCamera({ target }: { target: MutableRefObject<VehicleState> }) {
  const camera = useThree(s => s.camera);
  const mode = useGame(s => s.cameraMode), resetKey = useGame(s => s.resetKey);
  const [brain] = useState(() => new CameraBrain());
  const lastReset = useRef(-1);
  useFrame((_, delta) => {
    if (lastReset.current !== resetKey) { brain.reset(target.current, mode); lastReset.current = resetKey; }
    brain.update(target.current, delta, mode, blockers);
    camera.position.copy(brain.position); camera.up.set(0, 1, 0); camera.lookAt(brain.lookAt);
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - brain.fov) > 0.000001) {
      camera.fov = brain.fov; camera.updateProjectionMatrix();
    }
  }, -1);
  return null;
}
