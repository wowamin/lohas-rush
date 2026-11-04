import { polar, type Point } from './roadNetwork.ts';
export type ServicePoint = {
  id: string; name: string; category: string; x: number; z: number; halfX: number; halfZ: number;
  height: number; color: string; arrival: Point; description: string;
  reference: { status: 'missing'; photo: null; required: string[]; unverified: string[] };
};
const reference = () => ({ status: 'missing' as const, photo: null, required: ['可使用的實景照片及來源授權'], unverified: ['外觀、入口與實際服務內容', '服務範圍及資格未核實，不構成服務承諾'] });
export const servicePoints: ServicePoint[] = [
  { id: 'day-work', name: '樂活島日間作業設施', category: '日間作業', x: -46, z: 10, halfX: 4, halfZ: 4, height: 5, color: '#e6cda8', arrival: polar(32, 31), description: '獨立於長者日照中心的遊戲服務建築；作業設施與長者日照不視為同一服務。實際對象與內容待確認。', reference: reference() },
  { id: 'clinic', name: '樂活全齡綜合診所', category: '診所', x: 14, z: 45, halfX: 2.5, halfZ: 5, height: 13, color: '#9fcbd7', arrival: polar(32, 2), description: '街邊狹長、多層量體的風格化佔位。未取得照片；診療項目、時段與資格未核實。', reference: reference() },
  { id: 'nursing', name: '長照住宿式機構', category: '住宿照護', x: 30, z: -37, halfX: 4, halfZ: 4, height: 9, color: '#c7bbda', arrival: polar(32, 16), description: '虛構住宿照護服務點；外觀、照護項目與入住資格待確認。', reference: reference() },
  { id: 'home-care', name: '居家長照服務', category: '居家服務', x: -16, z: -44, halfX: 4, halfZ: 4, height: 5, color: '#b7cfb6', arrival: polar(32, 22), description: '居家服務的遊戲探索據點；真實服務區域、資格與項目未核實。', reference: reference() },
  { id: 'transport', name: '永春居家護理所', category: '居護所', x: -35, z: -31, halfX: 4, halfZ: 4, height: 5, color: '#e6baab', arrival: polar(32, 25), description: '居家護理所是由專業護理師到宅提供醫療與護理服務的機構，負責處理需要專業執照執行的醫療處置，而非日常生活照顧。', reference: reference() },
  { id: 'hospital', name: '社區綜合醫院', category: '綜合醫院', x: 110, z: -30, halfX: 10, halfZ: 6, height: 16, color: '#dce8df', arrival: [110, -12], description: '虛構社區大型綜合醫院，非真實院所；醫療內容與服務承諾不在本原型中提供。', reference: reference() },
];
