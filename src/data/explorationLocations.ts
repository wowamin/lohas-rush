import { locations } from './locations.ts';
import { servicePoints } from './services.ts';
import { buildings } from './city.ts';
import type { ExplorationLocation } from '../exploration/types.ts';

// Immutable world definitions. Existing IDs remain stable across mission resets.
// Interaction anchors use the existing safe arrival areas, not building interiors.
const headquarters=buildings.find(building=>building.id==='headquarters')!;
export const explorationLocations: readonly ExplorationLocation[] = [
  ...locations.map(location=>({
    id:location.id, name:location.name, category:'daycare' as const,
    description:location.description, position:location.arrival,
    discoveryRadius:28, interactionRadius:8,
    journalTitle:`${location.shortName}的城市手記（暫定）`,
    journalContent:`【暫定遊戲文案】你在虛構城市中發現了${location.name}。停下來觀察入口、前庭與附近道路，記下這次探索的起點。這筆紀錄只代表遊戲中的發現；實際機構介紹、服務內容與地址尚待確認。`,
  })),
  {
    id:headquarters.id, name:'樂活集團總部・樂活現煮食', category:'service',
    description:headquarters.description,
    position:[headquarters.x,headquarters.z+headquarters.halfZ+5],
    discoveryRadius:32, interactionRadius:8,
    journalTitle:'同一棟樓，不同的照顧連結（暫定）',
    journalContent:'【暫定遊戲文案】這棟遊戲建築的 1F 是樂活現煮食團膳工廠與出貨裝卸空間，樓上是集團總部辦公室。觀察樓層與入口，想一想供餐與城市各據點之間的連結。本頁不提供真實班表、供餐承諾或營運資訊。',
  },
  ...servicePoints.map(service=>({
    id:service.id, name:service.name, category:'service' as const,
    description:service.description, position:service.arrival,
    discoveryRadius:20, interactionRadius:8,
    journalTitle:`${service.name}的探索筆記（暫定）`,
    journalContent:`【暫定遊戲文案】你在城市探索時找到了「${service.name}」這個${service.category}情境據點。觀察它與附近街道的位置，將這次發現收進自己的日記。此建築及介紹為遊戲示意，實際服務內容、服務範圍與合作資訊均待確認。`,
  })),
];
