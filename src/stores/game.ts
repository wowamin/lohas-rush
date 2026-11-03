import { create } from 'zustand';
import { locations } from '../data/city.ts';
import { hasArrived } from '../game/missions/missionSystem.ts';
import { SPAWN } from '../data/roadNetwork.ts';
import type { CameraMode } from '../game/camera/virtualCameras.ts';
import type { TransferPhase } from '../game/vehicle/passengerTransfer.ts';
type State = {
  speed: number; distance: number; missionIndex: number; completed: boolean; resetKey: number;
  x: number; z: number; angle: number;
  cameraMode: CameraMode; cycleCamera: () => void;
  transferPhase: TransferPhase; transferError: string; transferRequest: number;
  boardingDistance: number; parkedBusX: number; parkedBusZ: number;
  setBoardingTelemetry: (distance:number,x:number,z:number) => void;
  requestTransfer: () => void; setTransferStatus: (phase: TransferPhase, error?: string) => void;
  setTelemetry: (speed: number, distance: number, x?: number, z?: number, angle?: number) => void;
  visitPosition: (x: number, z: number) => void; reset: () => void;
};
export const useGame = create<State>(set => ({
  speed: 0, distance: 0, missionIndex: 0, completed: false, resetKey: 0,
  x: SPAWN.x, z: SPAWN.z, angle: SPAWN.angle,
  cameraMode: 'chase', cycleCamera: () => set(s => ({ cameraMode: s.cameraMode === 'chase' ? 'overview' : 'chase' })),
  transferPhase: 'stowed', transferError: '', transferRequest: 0,
  boardingDistance:0, parkedBusX:SPAWN.x, parkedBusZ:SPAWN.z,
  setBoardingTelemetry:(boardingDistance,parkedBusX,parkedBusZ)=>set({boardingDistance,parkedBusX,parkedBusZ}),
  requestTransfer: () => set(s => ({ transferRequest: s.transferRequest + 1 })),
  setTransferStatus: (transferPhase, transferError = '') => set(s => s.transferPhase === transferPhase && s.transferError === transferError ? s : { transferPhase, transferError }),
  setTelemetry: (speed, distance, x = SPAWN.x, z = SPAWN.z, angle = 0) => set({ speed, distance, x, z, angle }),
  visitPosition: (x, z) => set(s => s.completed || !hasArrived(x, z, s.missionIndex) ? s : s.missionIndex === locations.length - 1
    ? { completed: true } : { missionIndex: s.missionIndex + 1 }),
  reset: () => set(s => ({ speed: 0, distance: 0, x: SPAWN.x, z: SPAWN.z, angle: SPAWN.angle, cameraMode: 'chase', missionIndex: 0, completed: false, transferPhase: 'stowed', transferError: '', transferRequest: 0, boardingDistance:0, parkedBusX:SPAWN.x, parkedBusZ:SPAWN.z, resetKey: s.resetKey + 1 })),
}));
