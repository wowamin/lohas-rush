import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { locations } from '../data/city';
import { useGame } from '../stores/game';
import { createVehicle, interpolateVehicle, MAX_SUBSTEPS, STEP, stepVehicle } from './vehicle/drivingPhysics';
import { useDrivingInput } from './vehicle/useDrivingInput';
import { touchController } from './vehicle/touchController';
import { hasArrived } from './missions/missionSystem';
import { VehicleCamera } from './camera/VehicleCamera';

export function Car({ lowDetail = false }: { lowDetail?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const state = useRef(createVehicle());
  const previous = useRef(createVehicle());
  const rendered = useRef(createVehicle());
  const accumulator = useRef(0);
  const uiTimer = useRef(0);
  const resetKey = useGame(s => s.resetKey);
  const keys = useDrivingInput(resetKey);
  useEffect(() => {
    state.current = createVehicle(); previous.current = createVehicle(); rendered.current = createVehicle();
    accumulator.current = 0; uiTimer.current = 0;
  }, [resetKey]);
  useFrame((_, delta) => {
    const s = state.current;
    const dt = Math.min(delta, 0.1);
    const pressed = keys.current;
    const forward = Number(pressed.has('KeyW') || pressed.has('ArrowUp'));
    const reverse = Number(pressed.has('KeyS') || pressed.has('ArrowDown'));
    const steer = Number(pressed.has('KeyA') || pressed.has('ArrowLeft')) - Number(pressed.has('KeyD') || pressed.has('ArrowRight'));
    accumulator.current = Math.min(accumulator.current + dt, STEP * MAX_SUBSTEPS);
    let count = 0;
    while (accumulator.current >= STEP && count++ < MAX_SUBSTEPS) {
      Object.assign(previous.current, s);
      touchController.update(STEP);
      stepVehicle(s, {
        throttle: Math.max(forward, touchController.InputThrottle) - Math.max(reverse, touchController.InputReverse),
        steer: Math.max(-1, Math.min(1, steer - touchController.InputSteer)),
        brake: pressed.has('Space') || touchController.InputBrake > 0,
      });
      accumulator.current -= STEP;
      const game = useGame.getState();
      if (!game.completed && hasArrived(s.x, s.z, game.missionIndex)) game.visitPosition(s.x, s.z);
    }
    const visual = rendered.current;
    interpolateVehicle(previous.current, s, accumulator.current / STEP, visual);
    if (group.current) { group.current.position.set(visual.x, 0.56, visual.z); group.current.rotation.y = visual.angle; }
    uiTimer.current += dt;
    if (uiTimer.current >= 0.1) {
      const game = useGame.getState(); const destination = locations[game.missionIndex];
      game.setTelemetry(Math.round(Math.abs(s.speed) * 3.6), Math.round(Math.hypot(s.x - destination.arrival[0], s.z - destination.arrival[1])), s.x, s.z, s.angle);
      uiTimer.current = 0;
    }
  }, -2);
  return <group ref={group}>
    <VehicleCamera target={rendered} />
    {lowDetail && <mesh position={[0, -0.43, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.65, 1]}><circleGeometry args={[1.55, 24]} /><meshBasicMaterial color="#344b41" transparent opacity={0.18} depthWrite={false} /></mesh>}
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
