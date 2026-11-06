import { createStore } from 'zustand/vanilla';
import { explorationLocations } from '../data/explorationLocations.ts';
import { browserJournalStorage, EXPLORATION_STORAGE_KEY, loadJournal, serializeJournal, type JournalStorage } from '../exploration/persistence.ts';
import type { ExplorationEntries, ExplorationLocation, ExplorerPresence } from '../exploration/types.ts';

type State={
  entries:ExplorationEntries;
  notices:string[];
  storageNotice:string;
  activeInteractionId:string|null;
  bindPlayer:(reader:()=>ExplorerPresence|null)=>()=>void;
  observe:()=>void;
  interactionProblem:(id:string)=>string|null;
  beginInteraction:(id:string)=>boolean;
  completeInteraction:(id:string)=>boolean;
  endInteraction:()=>void;
  dismissNotice:()=>void;
  clearJournal:(confirmed:boolean)=>boolean;
};
type Options={locations?:readonly ExplorationLocation[];storage?:JournalStorage|null;storageKey?:string;now?:()=>number;getPresence?:()=>ExplorerPresence|null};

// One personal journal per local player. World data, live pose and UI notifications
// are not part of the serialized save. No coupling to mission advancement/reset.
export function createExplorationStore(options:Options={}) {
  const world=options.locations??explorationLocations,now=options.now??Date.now;
  const storage=options.storage===undefined?browserJournalStorage():options.storage;
  const saveKey=options.storageKey??EXPLORATION_STORAGE_KEY;
  const ids=new Set(world.map(location=>location.id));
  let reader=options.getPresence??(()=>null),inside=new Set<string>();
  let loaded:ReturnType<typeof loadJournal>;
  try{loaded=loadJournal(storage?.getItem(saveKey)??null,ids,now());}
  catch{loaded={entries:{},notice:'無法讀取本機存檔；本次探索會保留在記憶體。',writable:true};}
  if(!storage&&!loaded.notice)loaded.notice='本機儲存不可用；本次探索只保留在這次遊戲中。';
  if(loaded.migrated&&storage){
    try{storage.setItem(saveKey,serializeJournal(loaded.entries));}
    catch{loaded.notice+='轉換後的資料無法寫入本機，本次仍可在記憶體中使用。';}
  }
  let writable=loaded.writable;
  return createStore<State>((set,get)=>{
    const persist=(entries:ExplorationEntries)=>{
      if(!storage||!writable)return;
      try{storage.setItem(saveKey,serializeJournal(entries));}
      catch{set({storageNotice:'無法寫入本機存檔（可能空間不足或儲存受限）；本次探索仍可繼續，但重新載入可能遺失。'});}
    };
    const problem=(id:string)=>{
      const location=world.find(location=>location.id===id),presence=reader();
      if(!location||!get().entries[id])return '請先靠近並發現這個據點。';
      if(!presence||!presence.available)return '請先等候接送動作完成。';
      if(!Number.isFinite(presence.speed)||Math.abs(presence.speed)>.0001)return '請先完全停穩車輛或輪椅，再查看據點卡。';
      if(!Number.isFinite(presence.x)||!Number.isFinite(presence.z)||Math.hypot(presence.x-location.position[0],presence.z-location.position[1])>location.interactionRadius)return '請到據點互動範圍內停妥，再查看據點卡。';
      return null;
    };
    return {
      entries:loaded.entries,notices:[],storageNotice:loaded.notice,activeInteractionId:null,
      bindPlayer:next=>{
        reader=next;
        return ()=>{if(reader===next){reader=()=>null;set({activeInteractionId:null});}};
      },
      observe:()=>{
        const presence=reader();
        if(!presence||!Number.isFinite(presence.x)||!Number.isFinite(presence.z))return;
        const inRange=new Set(world.filter(location=>Math.hypot(presence.x-location.position[0],presence.z-location.position[1])<=location.discoveryRadius).map(location=>location.id));
        const fresh=[...inRange].filter(id=>!inside.has(id)&&!get().entries[id]);inside=inRange;
        if(!fresh.length)return;
        const entries={...get().entries};
        for(const id of fresh)entries[id]={discoveredAt:now(),completedAt:null};
        set(state=>({entries,notices:[...state.notices,...fresh]}));persist(entries);
      },
      interactionProblem:problem,
      beginInteraction:id=>{if(problem(id)!==null)return false;set({activeInteractionId:id});return true;},
      completeInteraction:id=>{
        if(get().activeInteractionId!==id||problem(id)!==null)return false;
        const entry=get().entries[id];
        if(entry.completedAt===null){
          const entries={...get().entries,[id]:{...entry,completedAt:Math.max(now(),entry.discoveredAt)}};
          set({entries,activeInteractionId:null});persist(entries);
        }else set({activeInteractionId:null});
        return true;
      },
      endInteraction:()=>set({activeInteractionId:null}),
      dismissNotice:()=>set(state=>({notices:state.notices.slice(1)})),
      clearJournal:confirmed=>{
        if(!confirmed)return false;
        const presence=reader();
        inside=new Set(presence?world.filter(location=>Math.hypot(presence.x-location.position[0],presence.z-location.position[1])<=location.discoveryRadius).map(location=>location.id):[]);
        let notice='已清除探索日記；主線進度保持不變。離開附近據點後再次靠近，即可重新發現。';
        try{storage?.removeItem(saveKey);writable=true;}
        catch{notice='本次日記已清空，但無法移除本機存檔，重新載入可能恢復舊資料。';}
        if(!storage)notice+='本機儲存目前不可用。';
        set({entries:{},notices:[],activeInteractionId:null,storageNotice:notice});
        return true;
      },
    };
  });
}
export const explorationStore=createExplorationStore();
