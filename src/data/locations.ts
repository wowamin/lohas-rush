import type { Point } from './roadNetwork.ts';
import { generatedCity } from './buildingLots.ts';
import { streetDistricts } from './streetGrid.ts';
export type Location = {
  id: string; name: string; shortName: string; description: string;
  position: [number, number, number]; arrival: Point; roadNode: string; radius: number; color: string;
  lotId: string; rotation: number; district: string;
  reference: { status: 'missing'; photo: null; required: string[]; unverified: string[] };
};
const names = ['永春大和', '樂活安南', '七股龍山', '七股義合', '樂活新營'];
const colors = ['#efad91', '#9fcbd7', '#c6b2dd', '#e6c981', '#a9c7a4'];
export const locations: Location[] = names.map((shortName, index) => {
  const { point, prefab } = generatedCity.centers[index];
  return {
    id: prefab, shortName, name: `${shortName}日照中心`,
    description: `沿金色道路前往${streetDistricts.find(d => d.id === point.district)?.name ?? '街區'}的${shortName}，駛入抵達區。建築為幾何佔位。`,
    position: [...point.position], arrival: [...point.arrival], roadNode: point.roadNode, radius: 4, color: colors[index], lotId: point.id, rotation: point.rotation, district: point.district!,
    reference: { status: 'missing', photo: null, required: ['可使用的正面照片', '側面／入口照片', '照片來源與使用授權'], unverified: ['實際外觀與樓層', '入口方向', '真實地址及服務資訊；遊戲座標不代表真實位置'] },
  };
});
