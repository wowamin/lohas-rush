import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { locations } from '../data/city';
import { useGame } from '../stores/game';
import { createVehicle, interpolateVehicle, MAX_SUBSTEPS, STEP, stepVehicle } from './vehicle/drivingPhysics';
import { useDrivingInput } from './vehicle/useDrivingInput';
import { touchController } from './vehicle/touchController';
import { hasArrived } from './missions/missionSystem';
import { VehicleCamera } from './camera/VehicleCamera';
import { ServiceVanModel } from './vehicle/ServiceVanModel';
import { PassengerTransfer } from './vehicle/passengerTransfer';
import { PassengerRig } from './vehicle/PassengerRig';
import { wheelchairDock, wheelchairLocal, stepWheelchair } from './vehicle/wheelchairController';
import { DriverRig } from './vehicle/DriverRig';
import { CaregiverRig } from './vehicle/CaregiverRig';

export function Car({ lowDetail = false }: { lowDetail?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const state = useRef(createVehicle());
  const previous = useRef(createVehicle());
  const rendered = useRef(createVehicle());
  const chair = useRef(wheelchairDock(createVehicle())), previousChair = useRef({...chair.current}), renderedChair = useRef({...chair.current});
  const cameraTarget = useRef(createVehicle());
  const accumulator = useRef(0);
  const uiTimer = useRef(0);
  const transfer = useRef(new PassengerTransfer());
  const lastTransferRequest = useRef(0);
  const appliedReset = useRef(useGame.getState().resetKey);
  const resetKey = useGame(s => s.resetKey);
  const keys = useDrivingInput(resetKey);
  useFrame((_, delta) => {
    const s = state.current;
    const currentGame = useGame.getState();
    // Apply the reset before reading requests or stepping any old transfer phase.
    // A rewound request counter must never be mistaken for a new button press.
    if (appliedReset.current !== currentGame.resetKey) {
      appliedReset.current = currentGame.resetKey;
      Object.assign(s,createVehicle()); Object.assign(previous.current,s); Object.assign(rendered.current,s);
      accumulator.current = 0; uiTimer.current = 0;
      transfer.current.reset(); lastTransferRequest.current = currentGame.transferRequest;
      Object.assign(chair.current,wheelchairDock(s)); Object.assign(previousChair.current,chair.current); Object.assign(renderedChair.current,chair.current);
      keys.current.clear(); touchController.clear();
    }
    const dt = Math.min(delta, 0.1);
    const pressed = keys.current;
    const request = useGame.getState().transferRequest;
    if (request > lastTransferRequest.current) {
      lastTransferRequest.current = request;
      const error = transfer.current.request(s,wheelchairLocal(chair.current,s));
      if (!error) { pressed.clear(); touchController.clear(); chair.current.speed=0; }
      useGame.getState().setTransferStatus(transfer.current.phase,error);
    }
    const lockInputsThisFrame = transfer.current.locked;
    const forward = Number(pressed.has('KeyW') || pressed.has('ArrowUp'));
    const reverse = Number(pressed.has('KeyS') || pressed.has('ArrowDown'));
    const steer = Number(pressed.has('KeyA') || pressed.has('ArrowLeft')) - Number(pressed.has('KeyD') || pressed.has('ArrowRight'));
    accumulator.current = Math.min(accumulator.current + dt, STEP * MAX_SUBSTEPS);
    let count = 0;
    let controlsChanged = false;
    while (accumulator.current >= STEP && count++ < MAX_SUBSTEPS) {
      Object.assign(previous.current, s);
      Object.assign(previousChair.current,chair.current);
      touchController.update(STEP);
      const oldPhase = transfer.current.phase;
      if (oldPhase === 'outside') stepWheelchair(chair.current, {
        throttle:controlsChanged ? 0 : Math.max(forward,touchController.InputThrottle)-Math.max(reverse,touchController.InputReverse),
        steer:controlsChanged ? 0 : Math.max(-1,Math.min(1,steer-touchController.InputSteer)),
        brake:controlsChanged || pressed.has('Space') || touchController.InputBrake>0,
      },s,STEP);
      if (transfer.current.locked || lockInputsThisFrame) s.speed = 0;
      else stepVehicle(s, {
        throttle: Math.max(forward, touchController.InputThrottle) - Math.max(reverse, touchController.InputReverse),
        steer: Math.max(-1, Math.min(1, steer - touchController.InputSteer)),
        brake: pressed.has('Space') || touchController.InputBrake > 0,
      });
      transfer.current.step(STEP);
      if (oldPhase !== transfer.current.phase) {
        useGame.getState().setTransferStatus(transfer.current.phase);
        if (transfer.current.phase === 'outside') {
          Object.assign(chair.current,wheelchairDock(s)); Object.assign(previousChair.current,chair.current);
          useGame.getState().setBoardingTelemetry(0,s.x,s.z);
        }
        if (!transfer.current.locked || transfer.current.phase === 'outside') { pressed.clear(); touchController.clear(); controlsChanged=true; }
      }
      accumulator.current -= STEP;
      const game = useGame.getState();
      if (!game.completed && hasArrived(s.x, s.z, game.missionIndex)) game.visitPosition(s.x, s.z);
    }
    const visual = rendered.current;
    interpolateVehicle(previous.current, s, accumulator.current / STEP, visual);
    interpolateVehicle(previousChair.current,chair.current,accumulator.current / STEP,renderedChair.current);
    const outside=transfer.current.phase === 'outside';
    const active=outside ? renderedChair.current : visual;
    Object.assign(cameraTarget.current,active);
    if (group.current) { group.current.position.set(visual.x, 0, visual.z); group.current.rotation.y = visual.angle; }
    uiTimer.current += dt;
    if (uiTimer.current >= 0.1) {
      const game = useGame.getState(); const destination = locations[game.missionIndex];
      game.setTelemetry(Math.round(Math.abs(active.speed) * 3.6), Math.round(Math.hypot(active.x - destination.arrival[0], active.z - destination.arrival[1])), active.x, active.z, active.angle);
      const dock=wheelchairDock(s);
      game.setBoardingTelemetry(Math.hypot(chair.current.x-dock.x,chair.current.z-dock.z),s.x,s.z);
      uiTimer.current = 0;
    }
  }, -2);
  return <group ref={group}>
    <VehicleCamera target={cameraTarget} parkedBus={rendered} />
    {lowDetail && <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.65, 1]}><circleGeometry args={[1.55, 24]} /><meshBasicMaterial color="#344b41" transparent opacity={0.18} depthWrite={false} /></mesh>}
    <ServiceVanModel transfer={transfer} />
    <PassengerRig transfer={transfer} wheelchair={renderedChair} bus={rendered} />
    <DriverRig transfer={transfer} />
    <CaregiverRig transfer={transfer} wheelchair={renderedChair} bus={rendered} />
  </group>;
}
