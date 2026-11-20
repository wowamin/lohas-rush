import { locations } from '../data/locations.ts';
import { SPAWN } from '../data/roadNetwork.ts';
import { collides } from '../game/collision/collisionSystem.ts';

export const JOURNEY_STORAGE_KEY = 'lohas-rush:journey';
export type JourneyStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type Journey = {
  missionIndex: number; completed: boolean;
  vehicle: { x: number; z: number; angle: number };
  cameraMode: 'chase' | 'overview';
};
export const newJourney = (): Journey => ({
  missionIndex: 0, completed: false, vehicle: { x: SPAWN.x, z: SPAWN.z, angle: SPAWN.angle }, cameraMode: 'chase',
});
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const route = locations.map(location => location.id);

export function loadJourney(raw: string | null): { journey: Journey; notice: string; writable: boolean; savedAt: number | null } {
  const empty = { journey: newJourney(), notice: '', writable: true, savedAt: null };
  if (raw === null) return empty;
  try {
    const data: unknown = JSON.parse(raw);
    if (!object(data)) throw new Error('Invalid save');
    if (Number.isSafeInteger(data.version) && (data.version as number) > 1)
      return { ...empty, writable: false, notice: '旅程存檔來自較新版本，已保留原檔；本次旅程暫不儲存。' };
    if (data.version !== 1 || JSON.stringify(data.route) !== JSON.stringify(route) ||
      !Number.isInteger(data.missionIndex) || (data.missionIndex as number) < 0 || (data.missionIndex as number) >= locations.length ||
      typeof data.completed !== 'boolean' || (data.completed && data.missionIndex !== locations.length - 1) ||
      !object(data.vehicle) || !finite(data.vehicle.x) || !finite(data.vehicle.z) || !finite(data.vehicle.angle) ||
      !finite(data.savedAt) || data.savedAt < 0 || !['chase', 'overview'].includes(data.cameraMode as string)) throw new Error('Invalid save');
    const blocked = collides(data.vehicle.x, data.vehicle.z);
    return {
      journey: { missionIndex: data.missionIndex as number, completed: data.completed,
        vehicle: blocked ? newJourney().vehicle : { x: data.vehicle.x, z: data.vehicle.z, angle: Math.atan2(Math.sin(data.vehicle.angle), Math.cos(data.vehicle.angle)) },
        cameraMode: data.cameraMode as Journey['cameraMode'] },
      writable: true, savedAt: data.savedAt,
      notice: blocked ? '已保留五站進度；原停車位置無法使用，車輛已回到起點。' : '已接續上次旅程，車輛已停穩，乘客與平台已收妥。',
    };
  } catch { return { ...empty, notice: '旅程存檔格式無效，已從起點開始；探索日記保持不變。' }; }
}

export function serializeJourney(journey: Journey, savedAt: number) {
  return JSON.stringify({ version: 1, route, ...journey, savedAt });
}
export function browserJourneyStorage(): JourneyStorage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
