import { cityConfig, plannedMissionOrder } from './cityConfig.ts';
import { plannedDistrictAt } from './districtConfig.ts';
import type { FacilityType, PlannedBuilding, PlannedFloor, WorldPosition } from './cityTypes.ts';

type Entry = {
  id: string;
  name: string;
  type: FacilityType;
  position: WorldPosition;
  size?: readonly [width: number, height: number, depth: number];
  nameStatus?: PlannedBuilding['nameStatus'];
  evidence?: PlannedBuilding['evidence'];
  notes?: string;
  serviceDescription?: string;
  serviceRelation?: PlannedBuilding['serviceRelation'];
  floors?: readonly PlannedFloor[];
  collision?: boolean;
};

function building(entry: Entry): PlannedBuilding {
  const [width, height, depth] = entry.size ?? [24, 12, 20];
  const order = (plannedMissionOrder as readonly string[]).indexOf(entry.id);
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    nameStatus: entry.nameStatus ?? 'provided',
    district: plannedDistrictAt(entry.position[0], entry.position[2]),
    position: entry.position,
    dimensions: { width, height, depth },
    serviceDescription: entry.serviceDescription ?? '服務範圍及詳細項目待正式資料確認；此建築僅為未啟用的城市規劃示意。',
    ...(entry.floors ? { floors: entry.floors } : {}),
    serviceRelation: entry.serviceRelation ?? (entry.evidence === 'planning' ? 'planning' : 'unverified'),
    hasMission: order >= 0,
    missionOrder: order < 0 ? null : order + 1,
    missionId: order < 0 ? null : `c-day-center-mission-${order + 1}`,
    modelPath: null,
    collision: { enabled: entry.collision ?? true, shape: 'aabb', halfSize: [width / 2, depth / 2] },
    rendering: {
      instanceKey: `${entry.type}-planned`,
      lod: [
        { minDistance: 0, representation: 'model' },
        { minDistance: cityConfig.lod.modelDistance, representation: 'proxy' },
        { minDistance: cityConfig.lod.cullDistance, representation: 'hidden' },
      ],
      chunkId: `${Math.floor(entry.position[0] / cityConfig.streaming.chunkSize)},${Math.floor(entry.position[2] / cityConfig.streaming.chunkSize)}`,
    },
    evidence: entry.evidence ?? 'user-request',
    notes: entry.notes ?? '未啟用的規劃資料；座標、尺寸和服務內容不代表實際地址、建築或服務範圍。',
  };
}

function polar(radius: number, degrees: number): WorldPosition {
  const angle = degrees * Math.PI / 180;
  return [Math.round(Math.cos(angle) * radius), 0, Math.round(Math.sin(angle) * radius)];
}

const headquartersFloors: readonly PlannedFloor[] = [
  {
    id: 'ground',
    name: '1F｜樂活現煮食（團膳工廠）',
    height: 6,
    serviceDescription: '同棟總部大樓 1F：團膳工廠、出餐月台及保溫餐車裝卸區。',
  },
  {
    id: 'office',
    name: '2F｜樂活長照集團總部辦公室',
    height: 6,
    serviceDescription: '同棟總部大樓 2F：樂活長照集團總部辦公室。',
  },
];
const headquartersFootprintScale = Math.sqrt(1.3);

export const plannedDayCenters: readonly PlannedBuilding[] = [
  building({ id: 'c-daihe', name: '永春大和日照中心', type: 'day-center', position: [-300, 0, -410], serviceDescription: '任務 1：永春大和日照中心。此為保留任務順序的規劃據點。' }),
  building({ id: 'c-annan', name: '樂活安南日照中心', type: 'day-center', position: [360, 0, -460], serviceDescription: '任務 2：樂活安南日照中心。此為保留任務順序的規劃據點。' }),
  building({ id: 'c-longshan', name: '樂活七股龍山日照中心', type: 'day-center', position: [730, 0, 0], serviceDescription: '任務 3：樂活七股龍山日照中心。此為保留任務順序的規劃據點。' }),
  building({ id: 'c-yihe', name: '樂活七股義合日照中心', type: 'day-center', position: [380, 0, 510], notes: '使用者指定座標距中心約 636，與半徑 650 的中環道路衝突；座標保留，啟用前必須完成道路局部繞行與退縮驗證。', serviceDescription: '任務 4：樂活七股義合日照中心。座標與中環道路有已記錄的衝突，尚未啟用。' }),
  building({ id: 'c-xinying', name: '樂活新營日照中心', type: 'day-center', position: [-460, 0, 530], serviceDescription: '任務 5：樂活新營日照中心。此為保留任務順序的規劃據點。' }),
];

export const providedNursingHomeNames = [
  '永春護理之家',
  '萬年護理之家',
  '慈祥護理之家',
  '蘭亭居護理之家',
] as const;

export const providedResidentialCareNames = [
  '樂活新營住宿式長照機構',
  '東園老人長期照顧中心',
  '康健老人長期照顧中心',
  '康泰老人長期照顧中心',
  '美麗園老人長期照顧中心',
  '裕康美老人長期照顧中心',
  '樂活屋老人長期照顧中心',
  '北門綜合長照機構',
] as const;

const nursingHomes = providedNursingHomeNames.map((name, i) => building({
  id: `c-nursing-home-${String(i + 1).padStart(2, '0')}`,
  name,
  type: 'nursing-home',
  position: polar(1080, i * 18),
  size: [32, 16, 24],
  serviceDescription: `${name}｜護理之家規劃據點。實際服務資訊待確認。`,
}));

const residentialCare = providedResidentialCareNames.map((name, i) => building({
  id: `c-residential-care-${String(i + 1).padStart(2, '0')}`,
  name,
  type: 'residential-care',
  position: polar(1080, (i + 4) * 18),
  size: [32, 16, 24],
  serviceDescription: `${name}｜住宿式長照機構規劃據點。實際服務資訊待確認。`,
}));

const careAndSocialServices: readonly Entry[] = [
  { id: 'c-clinic', name: '樂活全齡綜合診所', type: 'clinic', position: polar(810, 0), size: [12, 22, 28], serviceDescription: '樂活全齡綜合診所規劃據點；科別、門診與服務時間待確認。', notes: '獨立街邊狹長多層診所；尺寸為規劃值，不代表實測圖。' },
  { id: 'c-foundation', name: '樂活社會福利慈善事業基金會', type: 'foundation', position: polar(810, 30), serviceDescription: '樂活社會福利慈善事業基金會規劃據點；服務項目待確認。' },
  { id: 'c-a-unit', name: '永春 A 單位', type: 'care-management', position: polar(810, 60), serviceDescription: '永春 A 單位整合型服務中心規劃據點；受理與服務流程待確認。' },
  { id: 'c-training', name: '樂活培訓所', type: 'training', position: polar(810, 90), serviceDescription: '樂活培訓所長照人才培訓規劃據點；課程及招生資訊待確認。' },
  { id: 'c-lohas-island', name: '樂活島', type: 'disability-service', position: polar(810, 120), serviceDescription: '樂活島身障服務據點規劃；與長者日照任務分開。', notes: '依使用者本次資料列為身障服務節點，不與長者日照任務混用。' },
];

const homeServices: readonly Entry[] = [
  { id: 'c-home-nursing', name: '永春居家護理所', type: 'home-nursing', position: polar(810, 150), serviceDescription: '永春居家護理所規劃據點；實際服務範圍待確認。' },
  { id: 'c-yongchun-home-care', name: '永春居家長照機構', type: 'home-care', position: polar(810, 180), serviceDescription: '永春居家長照機構規劃據點；實際服務範圍待確認。' },
  { id: 'c-yongxia-home-care', name: '永夏居家長照機構', type: 'home-care', position: polar(810, 210), serviceDescription: '永夏居家長照機構規劃據點；實際服務範圍待確認。' },
];

export const partnerHospitals: readonly PlannedBuilding[] = [
  ['south-ministry', '部南'],
  ['city-hospital', '市醫'],
  ['annan', '安南'],
  ['tainan-sinlau', '台南新樓'],
  ['madou-sinlau', '麻豆新樓'],
  ['yongkang-chi-mei', '永康奇美'],
  ['liuying-chi-mei', '柳營奇美'],
  ['luzhu-show-chwan', '路竹秀傳'],
].map(([id, name], i) => building({
  id: `c-partner-hospital-${id}`,
  name: `${name}｜特約看護合作服務節點`,
  type: 'partner-hospital',
  position: polar(850, i * 45),
  size: [26, 14, 18],
  serviceRelation: 'partner-service',
  serviceDescription: `${name}為使用者指定的八大醫院特約看護網絡合作節點；屬合作服務，不代表樂活集團自營醫院。`,
  notes: '合作醫院看護服務節點；非樂活集團自營醫院。正式合作及服務範圍資料待確認。',
}));

const transportAndLogistics: readonly Entry[] = [
  { id: 'c-yijibang', name: '壹吉棒物流倉儲', type: 'logistics-warehouse', position: polar(810, 240), serviceDescription: '壹吉棒尿布與輔具物流倉儲規劃據點；作業資訊待確認。' },
  { id: 'c-accessible-transport-base', name: '大心復康巴士調度基地', type: 'transport-base', position: polar(810, 270), size: [32, 10, 24], serviceDescription: '大心復康巴士調度基地規劃據點；調度與服務範圍待確認。' },
];

const publicSpaces: readonly Entry[] = [
  { id: 'lohas-headquarters', name: '樂活長照集團總部暨樂活現煮食', type: 'headquarters', position: [-30, 0, -25], size: [40 * headquartersFootprintScale, 12, 28 * headquartersFootprintScale], floors: headquartersFloors, serviceDescription: '單一複合總部建築，占地面積較原規劃增加 30%：1F 為樂活現煮食團膳工廠、出餐月台及保溫餐車裝卸區；2F 為樂活長照集團總部辦公室。' },
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
  ...publicSpaces.map(entry => building({ ...entry, nameStatus: entry.id === 'lohas-headquarters' ? 'provided' : 'planning-label', evidence: entry.id === 'lohas-headquarters' ? 'user-request' : 'planning' })),
  ...nursingHomes,
  ...residentialCare,
  ...plannedDayCenters,
  ...careAndSocialServices.map(building),
  ...homeServices.map(building),
  ...partnerHospitals,
  ...transportAndLogistics.map(building),
];

// The planned ecosystem's missions remain data-only and do not replace the live game's missions.
export const plannedMissions = plannedMissionOrder.map((landmarkId, i) => ({
  id: `c-day-center-mission-${i + 1}`, landmarkId, order: i + 1, enabled: false as const, arrival: null,
}));
