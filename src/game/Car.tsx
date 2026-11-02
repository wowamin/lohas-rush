import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { locations } from '../data/city';
import { useGame } from '../stores/game';
import { createVehicle, MAX_SUBSTEPS, STEP, stepVehicle } from './vehicle/drivingPhysics';
import { useDrivingInput } from './vehicle/useDrivingInput';
import { hasArrived } from './missions/missionSystem';

export function Car() {
  const group = useRef<THREE.Group>(null);
  const state = useRef(createVehicle());
  const accumulator = useRef(0);
  const uiTimer = useRef(0);
  const { camera } = useThree();
  const resetKey = useGame(s => s.resetKey);
  const keys = useDrivingInput(resetKey);
  const cameraTarget = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3(0, 1, 9));
  const lookDesired = useRef(new THREE.Vector3());
  useEffect(() => {
    state.current = createVehicle(); accumulator.current = 0; uiTimer.current = 0;
    camera.position.set(0, 9, 27); lookTarget.current.set(0, 1, 9); camera.lookAt(lookTarget.current);
  }, [resetKey, camera]);
  useFrame((_, delta) => {
    const s = state.current;
    const dt = Math.min(delta, 0.1);
    const held = (...codes: string[]) => codes.some(code => keys.current.has(code));
    accumulator.current = Math.min(accumulator.current + dt, STEP * MAX_SUBSTEPS);
    let count = 0;
    while (accumulator.current >= STEP && count++ < MAX_SUBSTEPS) {
      stepVehicle(s, {
        throttle: Number(held('KeyW', 'ArrowUp')) - Number(held('KeyS', 'ArrowDown')),
        steer: Number(held('KeyA', 'ArrowLeft')) - Number(held('KeyD', 'ArrowRight')), brake: held('Space'),
      });
      accumulator.current -= STEP;
      const game = useGame.getState();
      if (!game.completed && hasArrived(s.x, s.z, game.missionIndex)) game.finishMission();
    }
    if (group.current) { group.current.position.set(s.x, 0.56, s.z); group.current.rotation.y = s.angle; }
    cameraTarget.current.set(s.x + Math.sin(s.angle) * 14, 9, s.z + Math.cos(s.angle) * 14);
    const smoothing = 1 - Math.exp(-4 * dt);
    camera.position.lerp(cameraTarget.current, smoothing);
    lookDesired.current.set(s.x - Math.sin(s.angle) * 3, 1.2, s.z - Math.cos(s.angle) * 3);
    lookTarget.current.lerp(lookDesired.current, smoothing); camera.lookAt(lookTarget.current);
    uiTimer.current += dt;
    if (uiTimer.current >= 0.1) {
      const game = useGame.getState(); const destination = locations[game.missionIndex];
      game.setTelemetry(Math.round(Math.abs(s.speed) * 3.6), Math.round(Math.hypot(s.x - destination.arrival[0], s.z - destination.arrival[1])));
      uiTimer.current = 0;
    }
  });
  return <group ref={group}>
    <mesh castShadow position={[0, 0.65, 0]}><boxGeometry args={[2.4, 1.25, 4.1]} /><meshStandardMaterial color="#fff8e8" /></mesh>
    <mesh castShadow position={[0, 1.5, 0.2]}><boxGeometry args={[2.15, 1, 2.7]} /><meshStandardMaterial color="#fff8e8" /></mesh>
    <mesh position={[0, 1.55, -1.16]}><boxGeometry args={[1.9, 0.64, 0.04]} /><meshStandardMaterial color="#6b9ca6" /></mesh>
    <mesh position={[0, 1.55, 1.57]}><boxGeometry args={[1.9, 0.64, 0.04]} /><meshStandardMaterial color="#6b9ca6" /></mesh>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * 1.09, 1.53, -0.45]}><boxGeometry args={[0.04, 0.65, 1]} /><meshStandardMaterial color="#6b9ca6" /></mesh>
      <mesh position={[side * 1.22, 0.65, 0]}><boxGeometry args={[0.04, 0.38, 3.8]} /><meshStandardMaterial color="#398878" /></mesh>
      <mesh position={[side * 1.1, 1.55, 0.78]}><boxGeometry args={[0.06, 0.18, 0.65]} /><meshStandardMaterial color="#398878" /></mesh>
      <mesh position={[side * 1.1, 1.55, 0.78]}><boxGeometry args={[0.06, 0.65, 0.18]} /><meshStandardMaterial color="#398878" /></mesh>
      {[-1.25, 1.25].map(z => <mesh key={z} castShadow position={[side * 1.22, 0, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.5, 0.5, 0.25, 12]} /><meshStandardMaterial color="#34434a" /></mesh>)}
      <mesh position={[side * 0.8, 0.7, -2.07]}><boxGeometry args={[0.42, 0.28, 0.05]} /><meshStandardMaterial color="#fff1b2" /></mesh>
      <mesh position={[side * 0.8, 0.7, 2.07]}><boxGeometry args={[0.32, 0.25, 0.05]} /><meshStandardMaterial color="#d47669" /></mesh>
    </group>)}
  </group>;
}
