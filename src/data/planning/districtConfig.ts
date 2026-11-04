import type { DistrictId, PlannedDistrict } from './cityTypes.ts';

export const districtConfig: readonly PlannedDistrict[] = [
  { id: 'central', name: '中央總部與廣場區', anchor: [0, 0, 0], purpose: '複合總部、噴水池及城市公共廣場', uses: ['headquarters', 'fountain', 'plaza', 'meal-factory'] },
  { id: 'north', name: '北部醫療與照護區', anchor: [0, 0, -800], purpose: '醫療、合作醫院、培訓及生活服務規劃', uses: ['clinic', 'partner-hospital', 'home-nursing', 'residential-care', 'nursing-home', 'training', 'transport-base', 'commerce'] },
  { id: 'northeast', name: '東北居家服務區', anchor: [600, 0, -600], purpose: '日照、居家及照護服務規劃', uses: ['day-center', 'partner-hospital', 'home-care', 'care-management', 'residential-care', 'nursing-home', 'other-service'] },
  { id: 'east', name: '東部全齡服務區', anchor: [800, 0, 0], purpose: '日照、全齡服務與公園規劃', uses: ['day-center', 'partner-hospital', 'clinic', 'foundation', 'residential-care', 'nursing-home', 'park'] },
  { id: 'southeast', name: '東南服務與社區區', anchor: [600, 0, 600], purpose: '日照、居家與社區服務規劃', uses: ['day-center', 'partner-hospital', 'home-nursing', 'care-management', 'home-care', 'foundation', 'housing', 'residential-care', 'nursing-home'] },
  { id: 'south', name: '南部生活支援區', anchor: [0, 0, 800], purpose: '居家、學校與生活支援規劃', uses: ['partner-hospital', 'home-care', 'meal-factory', 'foundation', 'training', 'residential-care', 'nursing-home', 'school'] },
  { id: 'southwest', name: '西南照護社區區', anchor: [-600, 0, 600], purpose: '日照、居家與社區服務規劃', uses: ['day-center', 'partner-hospital', 'day-work', 'disability-service', 'home-nursing', 'home-care', 'foundation', 'residential-care', 'nursing-home', 'public-utility'] },
  { id: 'west', name: '西部交通物流區', anchor: [-800, 0, 0], purpose: '身障服務、居家照護、復康交通與後勤服務規劃', uses: ['partner-hospital', 'day-work', 'disability-service', 'home-care', 'accessible-transport', 'transport-base', 'logistics-warehouse', 'meal-factory', 'parking', 'residential-care', 'nursing-home'] },
  { id: 'northwest', name: '西北培訓與照護區', anchor: [-600, 0, -600], purpose: '日照、居家照護及交通團膳後勤規劃', uses: ['day-center', 'partner-hospital', 'home-care', 'training', 'residential-care', 'nursing-home', 'accessible-transport', 'transport-base', 'meal-factory', 'logistics-warehouse'] },
];

// Sector assignments are planning metadata, not a new runtime road network.
const sectors: readonly DistrictId[] = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
export function plannedDistrictAt(x: number, z: number): DistrictId {
  if (Math.hypot(x, z) < 180) return 'central';
  return sectors[(Math.round(Math.atan2(z, x) / (Math.PI / 4)) + 8) % 8];
}
