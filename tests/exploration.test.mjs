import test from 'node:test';
import assert from 'node:assert/strict';
import {createExplorationStore,explorationStore} from '../src/stores/exploration.ts';
import {explorationLocations} from '../src/data/explorationLocations.ts';
import {locations} from '../src/data/locations.ts';
import {collides} from '../src/game/collision/collisionSystem.ts';
import {useGame} from '../src/stores/game.ts';
import {loadJournal,EXPLORATION_STORAGE_KEY as key} from '../src/exploration/persistence.ts';
import {explorationStatus} from '../src/exploration/types.ts';

class MemoryStorage{
  values=new Map();
  getItem(key){return this.values.get(key)??null;}
  setItem(key,value){this.values.set(key,value);}
  removeItem(key){this.values.delete(key);}
}
const point=explorationLocations[0],ids=new Set(explorationLocations.map(location=>location.id));
const presence=()=>({x:point.position[0],z:point.position[1],speed:0,available:true});

test('exploration reuses stable world IDs, safe arrival anchors and explicitly provisional content',()=>{
  assert.equal(explorationLocations.length,12);
  assert.equal(ids.size,12);
  assert.deepEqual(explorationLocations.filter(p=>p.category==='daycare').map(p=>p.id),locations.map(p=>p.id));
  assert.ok(explorationLocations.some(p=>p.id==='headquarters'&&p.journalContent.includes('1F')));
  for(const p of explorationLocations){
    assert.ok(p.discoveryRadius>p.interactionRadius&&p.interactionRadius>0);
    assert.equal(collides(...p.position),false,p.id+' has a usable interaction anchor');
    assert.match(p.journalContent,/暫定/);assert.match(p.journalTitle,/暫定/);
  }
});

test('first approach discovers while driving, repeated approaches never repeat first-discovery notices',()=>{
  const player=presence();player.speed=12;player.x+=point.discoveryRadius-1;
  const store=createExplorationStore({locations:[point],storage:null,getPresence:()=>player,now:()=>1000});
  store.getState().observe();assert.equal(explorationStatus(store.getState().entries[point.id]),'discovered');
  assert.deepEqual(store.getState().notices,[point.id]);
  store.getState().dismissNotice();const unchanged=store.getState();
  store.getState().observe();assert.equal(store.getState(),unchanged,'no frame-driven state changes when nothing is discovered');
  player.x+=100;store.getState().observe();player.x=point.position[0];store.getState().observe();
  assert.deepEqual(store.getState().notices,[]);
});

test('interaction requires discovery, a real stop, a valid phase and an in-range position; confirmation is explicit',()=>{
  const player=presence(),store=createExplorationStore({locations:[point],storage:null,getPresence:()=>player,now:()=>2000});
  assert.equal(store.getState().beginInteraction(point.id),false);
  store.getState().observe();
  for(const speed of [.01,5,-2]){player.speed=speed;assert.equal(store.getState().beginInteraction(point.id),false);}
  player.speed=0;player.x+=point.interactionRadius+.01;assert.equal(store.getState().beginInteraction(point.id),false);
  player.x=point.position[0];player.available=false;assert.equal(store.getState().beginInteraction(point.id),false);
  player.available=true;assert.equal(store.getState().completeInteraction(point.id),false,'seeing a discovered list entry alone cannot complete exploration');
  assert.equal(store.getState().beginInteraction(point.id),true);
  player.speed=.1;assert.equal(store.getState().completeInteraction(point.id),false,'confirmation rechecks the live physical pose');
  player.speed=0;assert.equal(store.getState().completeInteraction(point.id),true);
  assert.equal(explorationStatus(store.getState().entries[point.id]),'completed');
  assert.equal(store.getState().beginInteraction('unknown'),false);
  assert.equal(store.getState().beginInteraction(point.id),true,'completed locations remain readable/interactable');
  store.getState().endInteraction();assert.equal(store.getState().activeInteractionId,null);
});

test('journal saves only validated personal entries and survives reload without replaying notices',()=>{
  const storage=new MemoryStorage(),player=presence();let time=1000;
  const store=createExplorationStore({locations:[point],storage,getPresence:()=>player,now:()=>time});
  store.getState().observe();store.getState().beginInteraction(point.id);time=1200;store.getState().completeInteraction(point.id);
  const saved=JSON.parse(storage.getItem(key));assert.deepEqual(Object.keys(saved).sort(),['entries','version']);
  assert.equal(saved.version,1);assert.deepEqual(saved.entries[point.id],{discoveredAt:1000,completedAt:1200});
  assert.equal(JSON.stringify(saved).includes('missionIndex'),false);assert.equal(JSON.stringify(saved).includes('notices'),false);
  const reloaded=createExplorationStore({locations:[point],storage,getPresence:()=>player});
  assert.deepEqual(reloaded.getState().entries,store.getState().entries);reloaded.getState().observe();assert.deepEqual(reloaded.getState().notices,[]);
});

test('corrupt, malformed and unknown IDs recover safely while keeping valid entries',()=>{
  for(const raw of ['{bad','null','[]','{"version":1,"entries":[]}','{"version":"1","entries":{}}']){
    const loaded=loadJournal(raw,ids);assert.deepEqual(loaded.entries,{});assert.match(loaded.notice,/損壞|無效/);
  }
  const loaded=loadJournal(JSON.stringify({version:1,entries:{[point.id]:{discoveredAt:1000,completedAt:1200},ghost:{discoveredAt:1,completedAt:null},clinic:{discoveredAt:-1,completedAt:null},nursing:{discoveredAt:10,completedAt:9}}}),ids);
  assert.deepEqual(Object.keys(loaded.entries),[point.id]);assert.match(loaded.notice,/部分/);
});

test('known old ID-list saves migrate; unsupported versions are preserved until confirmed clearing',()=>{
  const old=loadJournal(JSON.stringify({version:0,discovered:[point.id,'unknown'],completed:[point.id]}),ids,500);
  assert.deepEqual(old.entries[point.id],{discoveredAt:500,completedAt:500});
  const legacyStorage=new MemoryStorage();legacyStorage.setItem(key,JSON.stringify({version:0,discovered:[point.id],completed:[point.id]}));
  createExplorationStore({locations:[point],storage:legacyStorage,now:()=>500});assert.equal(JSON.parse(legacyStorage.getItem(key)).version,1,'a migrated save is written once in the current format');
  const storage=new MemoryStorage(),raw=JSON.stringify({version:99,entries:{future:'data'}});storage.setItem(key,raw);
  const store=createExplorationStore({locations:[point],storage,getPresence:presence});store.getState().observe();
  assert.equal(storage.getItem(key),raw);assert.match(store.getState().storageNotice,/尚未支援/);
  assert.equal(store.getState().clearJournal(false),false);assert.equal(storage.getItem(key),raw);
  assert.equal(store.getState().clearJournal(true),true);assert.equal(storage.getItem(key),null);
});

test('unavailable or full storage never prevents discovery and confirmation in memory',()=>{
  const blocked={getItem(){throw new Error('blocked');},setItem(){throw new Error('quota');},removeItem(){throw new Error('blocked');}};
  const store=createExplorationStore({locations:[point],storage:blocked,getPresence:presence});
  store.getState().observe();assert.ok(store.getState().entries[point.id]);
  assert.equal(store.getState().beginInteraction(point.id),true);assert.equal(store.getState().completeInteraction(point.id),true);
  assert.match(store.getState().storageNotice,/無法寫入/);assert.equal(store.getState().clearJournal(true),true);assert.match(store.getState().storageNotice,/無法移除/);
});

test('clearing affects only the journal key, and a still-nearby location waits for exit/reentry',()=>{
  const storage=new MemoryStorage(),player=presence();storage.setItem('other-settings','keep');
  const store=createExplorationStore({locations:[point],storage,getPresence:()=>player});store.getState().observe();
  store.getState().clearJournal(true);store.getState().observe();assert.deepEqual(store.getState().entries,{});
  assert.equal(storage.getItem('other-settings'),'keep');assert.equal(storage.getItem(key),null);
  player.x+=100;store.getState().observe();player.x=point.position[0];store.getState().observe();assert.ok(store.getState().entries[point.id]);
});

test('personal store instances and save namespaces stay separate without changing world definitions',()=>{
  const storage=new MemoryStorage(),before=JSON.stringify(explorationLocations);
  const a=createExplorationStore({locations:[point],storage,storageKey:'player-a',getPresence:presence});
  const b=createExplorationStore({locations:[point],storage,storageKey:'player-b',getPresence:presence});
  a.getState().observe();a.getState().beginInteraction(point.id);a.getState().completeInteraction(point.id);
  assert.deepEqual(b.getState().entries,{});assert.equal(storage.getItem('player-b'),null);
  b.getState().observe();a.getState().clearJournal(true);
  assert.ok(storage.getItem('player-b'));assert.ok(b.getState().entries[point.id]);
  assert.equal(JSON.stringify(explorationLocations),before);
});

test('discovery and completion do not advance the mainline; mainline reset preserves the personal journal',()=>{
  useGame.getState().reset();
  const other=explorationLocations[2],player={x:other.position[0],z:other.position[1],speed:0,available:true};
  const unbind=explorationStore.getState().bindPlayer(()=>player);
  try{
    explorationStore.getState().clearJournal(true);player.x+=100;explorationStore.getState().observe();player.x=other.position[0];
    explorationStore.getState().observe();explorationStore.getState().beginInteraction(other.id);explorationStore.getState().completeInteraction(other.id);
    assert.equal(useGame.getState().missionIndex,0);assert.equal(useGame.getState().completed,false);
    useGame.getState().visitPosition(...locations[2].arrival);assert.equal(useGame.getState().missionIndex,0,'early visit cannot skip the five-stop order');
    const before=explorationStore.getState().entries;
    useGame.getState().visitPosition(...locations[0].arrival);assert.equal(useGame.getState().missionIndex,1);
    useGame.getState().reset();assert.equal(useGame.getState().missionIndex,0);assert.equal(explorationStore.getState().entries,before);
  }finally{explorationStore.getState().clearJournal(true);unbind();useGame.getState().reset();}
});
