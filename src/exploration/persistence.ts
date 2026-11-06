import type { ExplorationEntries } from './types.ts';

export const EXPLORATION_STORAGE_KEY='lohas-rush:exploration';
export const EXPLORATION_SAVE_VERSION=1;
export type JournalStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export type LoadedJournal={entries:ExplorationEntries;notice:string;writable:boolean;migrated?:boolean};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const timestamp=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;

export function loadJournal(raw:string|null,ids:ReadonlySet<string>,now=Date.now()):LoadedJournal {
  const empty={entries:{},notice:'',writable:true};
  if(raw===null)return empty;
  try {
    const data:unknown=JSON.parse(raw);
    if(!object(data))throw new Error('invalid journal');
    if(data.version===0){
      if(!Array.isArray(data.discovered)||!Array.isArray(data.completed))throw new Error('invalid legacy journal');
      const entries:ExplorationEntries={};
      for(const id of data.discovered)if(typeof id==='string'&&ids.has(id))entries[id]={discoveredAt:now,completedAt:null};
      for(const id of data.completed)if(typeof id==='string'&&ids.has(id))entries[id]={discoveredAt:now,completedAt:now};
      return {entries,notice:'已轉換舊版探索紀錄；原始發現時間未提供，以轉換時間記錄。',writable:true,migrated:true};
    }
    if(data.version!==EXPLORATION_SAVE_VERSION){
      if(typeof data.version!=='number'||!Number.isSafeInteger(data.version)||data.version<0)throw new Error('invalid version');
      return {entries:{},notice:'此存檔版本尚未支援，原始存檔已保留；本次探索暫存於記憶體。可另行確認清除後重新儲存。',writable:false};
    }
    if(!object(data.entries))throw new Error('invalid entries');
    const entries:ExplorationEntries={};let dropped=false;
    for(const [id,entry] of Object.entries(data.entries)){
      if(!ids.has(id)||!object(entry)||!timestamp(entry.discoveredAt)||!(entry.completedAt===null||(timestamp(entry.completedAt)&&entry.completedAt>=entry.discoveredAt))){dropped=true;continue;}
      entries[id]={discoveredAt:entry.discoveredAt,completedAt:entry.completedAt};
    }
    return {entries,notice:dropped?'部分存檔資料無效或據點已不存在，已保留可用的探索紀錄。':'',writable:true};
  }catch{return {...empty,notice:'探索存檔損壞或格式無效，已安全恢復空白日記。'};}
}
export function serializeJournal(entries:ExplorationEntries){return JSON.stringify({version:EXPLORATION_SAVE_VERSION,entries});}
export function browserJournalStorage():JournalStorage|null {
  try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}
}
