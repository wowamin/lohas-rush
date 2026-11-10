import { create } from 'zustand';
import { isQuality, QUALITY, type Quality } from '../game/rendering/quality';

const storageKey = 'lohas-rush-graphics-v1';
function initialQuality(): Quality {
  if(typeof location!=='undefined'){const requested=new URLSearchParams(location.search).get('quality');if(isQuality(requested))return requested;}
  try { const stored = localStorage.getItem(storageKey); if (isQuality(stored)) return stored; } catch { /* Playable without storage. */ }
  return typeof matchMedia !== 'undefined' && matchMedia('(any-pointer: coarse), (max-width: 850px)').matches ? 'low' : 'medium';
}
const initial = initialQuality();
type VisualState = {
  quality: Quality; ao: boolean; bloom: boolean; viewMode: 'game' | 'showcase'; building: string;
  captureRequest: number; captureStatus: string; panelOpen: boolean;
  setQuality: (quality: Quality) => void; setAO: (value: boolean) => void; setBloom: (value: boolean) => void;
  setViewMode: (mode: 'game' | 'showcase') => void; setBuilding: (id: string) => void;
  requestCapture: () => void; setCaptureStatus: (value: string) => void; togglePanel: () => void;
};
export const useVisual = create<VisualState>(set => ({
  quality: initial, ao: QUALITY[initial].ao, bloom: false, viewMode: 'game', building: 'headquarters',
  captureRequest: 0, captureStatus: '', panelOpen: false,
  setQuality: quality => { if (!isQuality(quality)) return; try { localStorage.setItem(storageKey, quality); } catch { /* Optional preference. */ } set({ quality, ao: QUALITY[quality].ao, bloom: false }); },
  setAO: ao => set(state => ({ ao: state.quality !== 'low' && ao })),
  setBloom: bloom => set(state => ({ bloom: state.quality === 'high' && bloom })),
  setViewMode: viewMode => set({ viewMode, captureStatus: '' }), setBuilding: building => set({ building }),
  requestCapture: () => set(state => ({ captureRequest: state.captureRequest + 1, captureStatus: '正在擷取…' })),
  setCaptureStatus: captureStatus => set({ captureStatus }), togglePanel: () => set(state => ({ panelOpen: !state.panelOpen })),
}));
