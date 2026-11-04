import { cityConfig, plannedMissionOrder } from './cityConfig.ts';
import { plannedDistrictAt } from './districtConfig.ts';
import type { FacilityType, PlannedBuilding, WorldPosition } from './cityTypes.ts';

type Entry = {
  id: string; name: string; type: FacilityType; position: WorldPosition;
  size?: readonly [width: number, height: number, depth: number];
  nameStatus?: PlannedBuilding['nameStatus']; evidence?: PlannedBuilding['evidence']; notes?: string; collision?: boolean;
};
function building(entry: Entry): PlannedBuilding {
  const [width, height, depth] = entry.size ?? [24, 12, 20];
  const order = (plannedMissionOrder as readonly string[]).indexOf(entry.id);
  return {
    id: entry.id, name: entry.name, type: entry.type, nameStatus: entry.nameStatus ?? 'provided',
    district: plannedDistrictAt(entry.position[0], entry.position[2]), position: entry.position,
    dimensions: { width, height, depth }, hasMission: order >= 0, missionOrder: order < 0 ? null : order + 1,
    modelPath: null,
    collision: { enabled: entry.collision ?? true, shape: 'aabb', halfSize: [width / 2, depth / 2] },
    rendering: { instanceKey: `${entry.type}-planned`,
      lod: [{ minDistance: 0, representation: 'model' }, { minDistance: cityConfig.lod.modelDistance, representation: 'proxy' },
        { minDistance: cityConfig.lod.cullDistance, representation: 'hidden' }],
      chunkId: `${Math.floor(entry.position[0] / cityConfig.streaming.chunkSize)},${Math.floor(entry.position[2] / cityConfig.streaming.chunkSize)}` },
    evidence: entry.evidence ?? 'user-request',
    notes: entry.notes ?? '僅為未啟用配置；座標與尺寸為遊戲規劃，不代表真實地址或建築，模型尚未提供。',
  };
}
function polar(radius: number, degrees: number): WorldPosition {
  const angle = degrees * Math.PI / 180;
  return [Math.round(Math.cos(angle) * radius), 0, Math.round(Math.sin(angle) * radius)];
}

export const plannedDayCenters: readonly PlannedBuilding[] = [
  building({ id: 'c-daihe', name: '永春大和', type: 'day-center', position: [-300, 0, -410] }),
  building({ id: 'c-annan', name: '樂活安南', type: 'day-center', position: [360, 0, -460] }),
  building({ id: 'c-longshan', name: '樂活龍山', type: 'day-center', position: [730, 0, 0] }),
  building({ id: 'c-yihe', name: '樂活義合', type: 'day-center', position: [380, 0, 510], notes: '使用者指定座標距中心約 636，與半徑 650 的中環道路衝突；座標保留，啟用前必須完成道路局部繞行與退縮驗證。' }),
  building({ id: 'c-xinying', name: '樂活新營', type: 'day-center', position: [-460, 0, 530] }),
];

// Counts come from this request. Official individual names await the missing image.
const residentialCare = Array.from({ length: 12 }, (_, i) => building({
  id: `c-residential-care-${String(i + 1).padStart(2, '0')}`, name: `住宿式機構（名稱待補 ${i + 1}）`, type: 'residential-care',
  position: polar(1080, i * 18), size: [32, 16, 24], nameStatus: 'pending', evidence: 'awaiting-service-overview',
}));
const nursingCenters = Array.from({ length: 8 }, (_, i) => building({
  id: `c-nursing-center-${String(i + 1).padStart(2, '0')}`, name: `看護中心（名稱待補 ${i + 1}）`, type: 'nursing-center',
  position: polar(1080, (i + 12) * 18), nameStatus: 'pending', evidence: 'awaiting-service-overview',
}));
const services: readonly Entry[] = [
  { id: 'c-clinic', name: '樂活全齡綜合診所', type: 'clinic', position: polar(810, 0), size: [12, 22, 28], notes: '獨立街邊狹長多層診所，12×28 平面、22 高；屬規劃尺寸，未取得模型或實測圖。' },
  { id: 'c-home-nursing', name: '永春居護所', type: 'home-nursing', position: polar(810, 30) },
  { id: 'c-care-management', name: '永春 A 單位', type: 'care-management', position: polar(810, 60) },
  { id: 'c-yongchun-home-care', name: '永春居家', type: 'home-care', position: polar(810, 90) },
  { id: 'c-yongxia-home-care', name: '永夏居家', type: 'home-care', position: polar(810, 120) },
  { id: 'c-foundation', name: '樂活基金會', type: 'foundation', position: polar(810, 150) },
  { id: 'c-lohas-island', name: '樂活島', type: 'day-work', position: polar(810, 180), evidence: 'existing-project', notes: '依現有 services.ts 的日間作業分類獨立預留，與長者日照中心分開；正式服務總覽與模型待補。' },
  { id: 'c-accessible-transport', name: '大心復康巴士', type: 'accessible-transport', position: polar(810, 210), size: [32, 10, 24] },
  { id: 'c-meal-factory', name: '樂活現煮食團膳工廠', type: 'meal-factory', position: polar(810, 240), size: [40, 12, 28] },
  { id: 'c-training', name: '樂活培訓所', type: 'training', position: polar(810, 270) },
  { id: 'c-yijibang', name: '壹吉棒', type: 'other-service', position: polar(810, 300), notes: '名稱依使用者提供，服務類型、外觀與模型待服務總覽確認。' },
];
const publicSpaces: readonly Entry[] = [
  { id: 'c-headquarters', name: '樂活集團總部', type: 'headquarters', position: [-30, 0, -25], size: [32, 18, 24] },
  { id: 'c-fountain', name: '中央噴水池', type: 'fountain', position: [30, 0, 20], size: [20, 3, 20] },
  { id: 'c-plaza', name: '城市廣場', type: 'plaza', position: [0, -.1, 0], size: [150, .1, 150], collision: false },
  { id: 'c-housing', name: '住宅街區預留地', type: 'housing', position: polar(520, 45), size: [40, 16, 30] },
  { id: 'c-commerce', name: '商圈預留地', type: 'commerce', position: polar(520, 270), size: [40, 12, 30] },
  { id: 'c-park', name: '公園預留地', type: 'park', position: polar(520, 0), size: [50, 1, 40], collision: false },
  { id: 'c-parking', name: '停車場預留地', type: 'parking', position: polar(520, 180), size: [40, 1, 30], collision: false },
  { id: 'c-school', name: '學校預留地', type: 'school', position: polar(520, 90), size: [40, 18, 30] },
  { id: 'c-utilities', name: '公共設施預留地', type: 'public-utility', position: polar(520, 135), size: [24, 8, 20] },
];

export const landmarkConfig: readonly PlannedBuilding[] = [
  ...publicSpaces.map(entry => building({ ...entry, nameStatus: 'planning-label', evidence: 'planning' })),
  ...residentialCare, ...nursingCenters, ...plannedDayCenters, ...services.map(building),
];

// Mission IDs/order only. Arrival triggers and drivable access need a later design.
export const plannedMissions = plannedMissionOrder.map((landmarkId, i) => ({
  id: `c-day-center-mission-${i + 1}`, landmarkId, order: i + 1, enabled: false as const, arrival: null,
}));
