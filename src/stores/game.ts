import { create } from 'zustand';
import { locations } from '../data/city.ts';
import { hasArrived } from '../game/missions/missionSystem.ts';
import { SPAWN } from '../data/roadNetwork.ts';
import type { CameraMode } from '../game/camera/virtualCameras.ts';
import type { TransferPhase } from '../game/vehicle/passengerTransfer.ts';
import type { AssistMode } from '../game/vehicle/drivingAssist.ts';
import { browserJourneyStorage, JOURNEY_STORAGE_KEY, loadJourney, serializeJourney, type Journey, type JourneyStorage } from '../progress/persistence.ts';
type State = {
  controlsPaused: boolean; setControlsPaused: (paused:boolean)=>void;
  assistMode: AssistMode; assistMessage:string; assistRun:number; assistBrakeRequest:number;
  startAssist:(mode:Exclude<AssistMode,'off'>)=>boolean; stopAssist:(message?:string,brake?:boolean)=>void;
  speed: number; distance: number; missionIndex: number; completed: boolean; resetKey: number;
  x: number; z: number; angle: number;
  cameraMode: CameraMode; cycleCamera: () => void;
  transferPhase: TransferPhase; transferError: string; transferRequest: number;
  boardingDistance: number; parkedBusX: number; parkedBusZ: number; parkedBusAngle: number;
  saveNotice: string; lastSavedAt: number | null; flushProgress: () => void;
  setBoardingTelemetry: (distance:number,x:number,z:number,angle?:number) => void;
  requestTransfer: () => void; setTransferStatus: (phase: TransferPhase, error?: string) => void;
  setTelemetry: (speed: number, distance: number, x?: number, z?: number, angle?: number) => void;
  visitPosition: (x: number, z: number) => void; reset: () => void;
};
export function createGameStore(storage: JourneyStorage | null = browserJourneyStorage(), now = Date.now) {
  let loaded = loadJourney(null);
  try { loaded = loadJourney(storage?.getItem(JOURNEY_STORAGE_KEY) ?? null); }
  catch { loaded.notice = '無法讀取本機旅程存檔，本次仍可遊玩。'; }
  const initial = loaded.journey;
  let lastWrite = -Infinity, lastContent = '';
  return create<State>((set, get) => {
    const save = (force = false) => {
      if (!loaded.writable || !storage) return;
      const time = now();
      if (!force && time - lastWrite < 2000) return;
      const s = get();
      const journey: Journey = { missionIndex: s.missionIndex, completed: s.completed, cameraMode: s.cameraMode === 'overview' ? 'overview' : 'chase',
        vehicle: { x: s.parkedBusX, z: s.parkedBusZ, angle: s.parkedBusAngle } };
      const content = JSON.stringify(journey);
      if (content === lastContent) return;
      lastWrite = time;
      try {
        storage.setItem(JOURNEY_STORAGE_KEY, serializeJourney(journey, time));
        lastContent = content; set({ lastSavedAt: time, saveNotice: '' });
      } catch { set({ saveNotice: '本機儲存空間不足或被停用，旅程目前未能儲存；請保留此頁面。' }); }
    };
    return {
  controlsPaused:false, setControlsPaused:controlsPaused=>{
    if(controlsPaused)get().stopAssist('輔助已停止，可再次選擇模式。');
    set({controlsPaused});
  },
  assistMode:'off',assistMessage:'',assistRun:0,assistBrakeRequest:0,
  startAssist:mode=>{
    const s=get();if(s.controlsPaused||s.transferPhase!=='stowed'||(mode==='route'&&s.completed))return false;
    set({assistMode:mode,assistMessage:mode==='cruise'?'自動前進中，請控制方向；按煞車可停止。':`正在前往${locations[s.missionIndex].shortName}，抵達後自動停車。`,assistRun:s.assistRun+1});return true;
  },
  stopAssist:(assistMessage='輔助已停止。',brake=true)=>{
    const s=get();if(s.assistMode==='off')return;
    set({assistMode:'off',assistMessage,assistBrakeRequest:s.assistBrakeRequest+(brake?1:0)});
  },
  speed: 0, distance: Math.round(Math.hypot(initial.vehicle.x-locations[initial.missionIndex].arrival[0], initial.vehicle.z-locations[initial.missionIndex].arrival[1])), missionIndex: initial.missionIndex, completed: initial.completed, resetKey: 0,
  x: initial.vehicle.x, z: initial.vehicle.z, angle: initial.vehicle.angle,
  cameraMode: initial.cameraMode, cycleCamera: () => { set(s => ({ cameraMode: s.cameraMode === 'chase' ? 'overview' : 'chase' })); save(true); },
  transferPhase: 'stowed', transferError: '', transferRequest: 0,
  boardingDistance:0, parkedBusX:initial.vehicle.x, parkedBusZ:initial.vehicle.z, parkedBusAngle:initial.vehicle.angle,
  saveNotice: storage ? loaded.notice : '本機儲存被停用，本次旅程將在關閉後消失。', lastSavedAt: loaded.savedAt,
  flushProgress: () => save(true),
  setBoardingTelemetry:(boardingDistance,parkedBusX,parkedBusZ,parkedBusAngle=get().parkedBusAngle)=>{ set({boardingDistance,parkedBusX,parkedBusZ,parkedBusAngle}); save(); },
  requestTransfer: () => {get().stopAssist('接送前已停止輔助，請先停穩車輛。');set(s => ({ transferRequest: s.transferRequest + 1 }));},
  setTransferStatus: (transferPhase, transferError = '') => {if(transferPhase!=='stowed')get().stopAssist('接送期間不啟用駕駛輔助。');set(s => s.transferPhase === transferPhase && s.transferError === transferError ? s : { transferPhase, transferError });},
  setTelemetry: (speed, distance, x = SPAWN.x, z = SPAWN.z, angle = 0) => set({ speed, distance, x, z, angle }),
  visitPosition: (x, z) => { const s=get(); if(s.completed || !hasArrived(x,z,s.missionIndex))return;
    get().stopAssist(`已抵達${locations[s.missionIndex].shortName}，停穩後可認識據點或體驗接送。`);
    set(s.missionIndex === locations.length - 1 ? { completed:true } : { missionIndex:s.missionIndex+1 }); save(true); },
  reset: () => { set(s => ({ speed: 0, distance: 0, x: SPAWN.x, z: SPAWN.z, angle: SPAWN.angle, cameraMode: 'chase', missionIndex: 0, completed: false, transferPhase: 'stowed', transferError: '', transferRequest: 0, boardingDistance:0, parkedBusX:SPAWN.x, parkedBusZ:SPAWN.z, parkedBusAngle:SPAWN.angle, resetKey: s.resetKey + 1 })); save(true); },
  };
  });
}
export const useGame = createGameStore();

// Mobile browsers may terminate a hidden tab without firing beforeunload.
if (typeof window !== 'undefined') {
  const flush = () => useGame.getState().flushProgress();
  const onVisibility = () => { if (document.hidden) flush(); };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', onVisibility);
  import.meta.hot?.dispose(() => {
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', onVisibility);
  });
}
