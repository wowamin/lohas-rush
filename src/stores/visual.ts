import { create } from 'zustand';
import { isQuality, QUALITY, readDeviceCapabilities, selectDeviceQuality, type Quality } from '../game/rendering/quality.ts';

const storageKey = 'lohas-rush-graphics-v1';
const modeKey = 'lohas-rush-graphics-mode-v1';
const device = selectDeviceQuality(readDeviceCapabilities());
function initialQuality(): { quality: Quality; mode: 'auto' | 'manual' } {
  if(typeof location!=='undefined'){const requested=new URLSearchParams(location.search).get('quality');if(isQuality(requested))return {quality:requested,mode:'manual'};}
  try { const stored = localStorage.getItem(storageKey), mode = localStorage.getItem(modeKey);
    if (mode !== 'auto' && isQuality(stored)) return {quality:stored,mode:'manual'};
  } catch { /* Playable without storage. */ }
  return {quality:device.initial,mode:'auto'};
}
const initial = initialQuality();
type VisualState = {
  quality: Quality; bloom: boolean; viewMode: 'game' | 'showcase'; building: string;
  qualityMode: 'auto' | 'manual'; qualityReason: string; autoCeiling: Quality;
  captureRequest: number; captureStatus: string; panelOpen: boolean;
  setQuality: (quality: Quality) => void; setBloom: (value: boolean) => void;
  setAutomaticQuality: () => void; adaptQuality: (quality: Quality, fps: number) => void;
  setViewMode: (mode: 'game' | 'showcase') => void; setBuilding: (id: string) => void;
  requestCapture: () => void; setCaptureStatus: (value: string) => void; togglePanel: () => void;
};
export const useVisual = create<VisualState>(set => ({
  quality: initial.quality, qualityMode:initial.mode, qualityReason:device.reason, autoCeiling:device.ceiling,
  bloom: false, viewMode: 'game', building: 'headquarters',
  captureRequest: 0, captureStatus: '', panelOpen: false,
  setQuality: quality => { if (!isQuality(quality)) return; try { localStorage.setItem(storageKey, quality); localStorage.setItem(modeKey,'manual'); } catch { /* Optional preference. */ } set({ quality, qualityMode:'manual', bloom: false }); },
  setAutomaticQuality: () => { const next=selectDeviceQuality(readDeviceCapabilities()); try{localStorage.setItem(modeKey,'auto');}catch{/* Optional preference. */} set({qualityMode:'auto',quality:next.initial,autoCeiling:next.ceiling,qualityReason:next.reason,bloom:false}); },
  adaptQuality: (quality,fps) => set(s => s.qualityMode==='manual' ? s : {quality,bloom:false,qualityReason:`依實測約 ${Math.round(fps)} FPS，自動調整為${QUALITY[quality].label}畫質。`}),
  setBloom: bloom => set(state => ({ bloom: state.quality === 'high' && bloom })),
  setViewMode: viewMode => set({ viewMode, captureStatus: '' }), setBuilding: building => set({ building }),
  requestCapture: () => set(state => ({ captureRequest: state.captureRequest + 1, captureStatus: '正在擷取…' })),
  setCaptureStatus: captureStatus => set({ captureStatus }), togglePanel: () => set(state => ({ panelOpen: !state.panelOpen })),
}));
