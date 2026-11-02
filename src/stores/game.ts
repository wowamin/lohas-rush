import { create } from 'zustand';
import { locations } from '../data/city.ts';
type State = {
  speed: number; distance: number; missionIndex: number; completed: boolean; resetKey: number;
  setTelemetry: (speed: number, distance: number) => void;
  finishMission: () => void; reset: () => void;
};
export const useGame = create<State>(set => ({
  speed: 0, distance: 0, missionIndex: 0, completed: false, resetKey: 0,
  setTelemetry: (speed, distance) => set({ speed, distance }),
  finishMission: () => set(s => s.completed ? s : s.missionIndex === locations.length - 1
    ? { completed: true } : { missionIndex: s.missionIndex + 1 }),
  reset: () => set(s => ({ speed: 0, distance: 0, missionIndex: 0, completed: false, resetKey: s.resetKey + 1 })),
}));
