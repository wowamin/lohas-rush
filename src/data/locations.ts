import type { Point } from './roadNetwork.ts';
import { generatedCity } from './buildingLots.ts';
import { streetDistricts } from './streetGrid.ts';
export type Location = {
  id: string; name: string; shortName: string; description: string;
  position: [number, number, number]; arrival: Point; roadNode: string; radius: number; color: string;
  lotId: string; rotation: number; district: string;
  reference: { status: 'provided' | 'missing'; source: 'user-attachment' | 'awaiting-photo'; photo: null; required: string[]; unverified: string[] };
};
const names = ['永春大和', '樂活安南', '七股龍山', '七股義合', '樂活新營'];
const colors = ['#efad91', '#9fcbd7', '#c6b2dd', '#e6c981', '#a9c7a4'];
export const locations: Location[] = names.map((shortName, index) => {
  const { point, prefab } = generatedCity.centers[index];
  return {
    id: prefab, shortName, name: `${shortName}日照中心`,
    description: index === 0 || index === 1 || index === 4
      ? `依使用者提供的${shortName}日照中心外觀參考製作的遊戲示意建築；沿金色道路駛入抵達區，模型比例與實際尺寸未核實。`
      : `沿金色道路前往${streetDistricts.find(d => d.id === point.district)?.name ?? '街區'}的${shortName}，駛入抵達區。建築為幾何佔位。`,
    position: [...point.position], arrival: [...point.arrival], roadNode: point.roadNode, radius: 4, color: colors[index], lotId: point.id, rotation: point.rotation, district: point.district!,
    reference: index === 0 || index === 1 || index === 4
      ? { status: 'provided', source: 'user-attachment', photo: null, required: ['側面／入口照片', '實際尺寸與樓層高度'], unverified: ['實際尺寸與比例', '真實地址及服務資訊；遊戲座標不代表真實位置'] }
      : { status: 'missing', source: 'awaiting-photo', photo: null, required: ['可使用的正面照片', '側面／入口照片', '照片來源與使用授權'], unverified: ['實際外觀與樓層', '入口方向', '真實地址及服務資訊；遊戲座標不代表真實位置'] },
  };
});
