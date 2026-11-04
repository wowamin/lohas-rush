import type { DistrictId, PlannedDistrict } from './cityTypes.ts';

export const districtConfig: readonly PlannedDistrict[] = [
  { id: 'central', name: '中央總部與廣場區', anchor: [0, 0, 0], purpose: '總部、噴水池及城市公共廣場', uses: ['headquarters', 'fountain', 'plaza'] },
  { id: 'north', name: '北部醫療與照護區', anchor: [0, 0, -800], purpose: '醫療及長照設施規劃', uses: ['clinic', 'home-nursing', 'residential-care', 'nursing-center'] },
  { id: 'northeast', name: '東北居家服務區', anchor: [600, 0, -600], purpose: '日照、居家及照護服務規劃', uses: ['day-center', 'home-care', 'care-management', 'residential-care', 'nursing-center'] },
  { id: 'east', name: '東部全齡服務區', anchor: [800, 0, 0], purpose: '日照與綜合服務規劃', uses: ['day-center', 'clinic', 'residential-care', 'nursing-center'] },
  { id: 'southeast', name: '東南服務與社區區', anchor: [600, 0, 600], purpose: '日照、居家與社區服務規劃', uses: ['day-center', 'home-nursing', 'care-management', 'home-care', 'housing', 'residential-care', 'nursing-center'] },
  { id: 'south', name: '南部生活支援區', anchor: [0, 0, 800], purpose: '居家、團膳與生活支援規劃', uses: ['home-care', 'meal-factory', 'foundation', 'residential-care', 'nursing-center'] },
  { id: 'southwest', name: '西南照護社區區', anchor: [-600, 0, 600], purpose: '日照、社區及日間作業規劃', uses: ['day-center', 'day-work', 'foundation', 'residential-care', 'nursing-center', 'public-utility'] },
  { id: 'west', name: '西部交通物流區', anchor: [-800, 0, 0], purpose: '復康交通與後勤服務規劃', uses: ['accessible-transport', 'meal-factory', 'parking', 'residential-care', 'nursing-center'] },
  { id: 'northwest', name: '西北培訓與照護區', anchor: [-600, 0, -600], purpose: '日照、培訓及照護規劃', uses: ['day-center', 'training', 'residential-care', 'nursing-center'] },
];

// Sector assignments are planning metadata, not a new runtime road network.
const sectors: readonly DistrictId[] = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
export function plannedDistrictAt(x: number, z: number): DistrictId {
  if (Math.hypot(x, z) < 180) return 'central';
  return sectors[(Math.round(Math.atan2(z, x) / (Math.PI / 4)) + 8) % 8];
}
