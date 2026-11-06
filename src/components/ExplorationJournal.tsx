import {useEffect,useRef,useState} from 'react';
import {useStore} from 'zustand';
import {explorationStore} from '../stores/exploration';
import {explorationLocations} from '../data/explorationLocations';
import {explorationStatus, type ExplorationCategory, type ExplorationStatus} from '../exploration/types';
import {useGame} from '../stores/game';

const statusLabels={undiscovered:'未發現',discovered:'已發現',completed:'已完成'};
const categoryLabels={daycare:'五間日照',service:'其他服務'};
export function ExplorationNotices(){
  const id=useStore(explorationStore,state=>state.notices[0]);
  useEffect(()=>{
    if(!id)return;
    const timer=window.setTimeout(()=>explorationStore.getState().dismissNotice(),5500);
    return ()=>window.clearTimeout(timer);
  },[id]);
  const location=explorationLocations.find(location=>location.id===id);
  return location?<div className="discovery-toast" role="status" aria-live="polite"><strong>✦ 首次發現：{location.name}</strong><span>停妥後，可從「探索日記」查看據點卡。</span></div>:null;
}

export function ExplorationJournal({onClose}:{onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),cancelClear=useRef<HTMLButtonElement>(null);
  const entries=useStore(explorationStore,state=>state.entries);
  const storageNotice=useStore(explorationStore,state=>state.storageNotice);
  const x=useGame(state=>state.x),z=useGame(state=>state.z);
  const [category,setCategory]=useState<'all'|ExplorationCategory>('all');
  const [status,setStatus]=useState<'all'|ExplorationStatus>('all');
  const [selection,setSelection]=useState<{id:string;mode:'interaction'|'read'}|null>(null);
  const [confirmClear,setConfirmClear]=useState(false);
  const [feedback,setFeedback]=useState('');
  const close=()=>{explorationStore.getState().endInteraction();onClose();};
  useEffect(()=>{
    const modal=dialog.current;modal?.showModal();
    return ()=>{modal?.close();explorationStore.getState().endInteraction();};
  },[]);
  useEffect(()=>{if(confirmClear)cancelClear.current?.focus();},[confirmClear]);
  const discovered=Object.keys(entries).length,completed=Object.values(entries).filter(entry=>entry.completedAt!==null).length;
  const selected=explorationLocations.find(location=>location.id===selection?.id);
  const pick=(id:string)=>{
    setFeedback('');
    if(entries[id]&&entries[id].completedAt!==null){explorationStore.getState().endInteraction();setSelection({id,mode:'read'});}
    else if(explorationStore.getState().beginInteraction(id))setSelection({id,mode:'interaction'});
    else setFeedback(explorationStore.getState().interactionProblem(id)??'目前無法互動，請關閉日記後重新停妥。');
  };
  const list=explorationLocations.filter(location=>(category==='all'||location.category===category)&&(status==='all'||explorationStatus(entries[location.id])===status));
  return <dialog className="exploration-journal" ref={dialog} aria-labelledby="journal-heading" onCancel={event=>{event.preventDefault();if(confirmClear)setConfirmClear(false);else close();}}>
    <div className="journal-heading"><div><span className="eyebrow">LOHAS RUSH · 我的城市探索</span><h2 id="journal-heading">探索日記</h2></div><button type="button" onClick={close} aria-label="關閉探索日記">關閉 ×</button></div>
    {confirmClear?<section className="journal-clear-confirm" aria-labelledby="journal-clear-heading">
      <h3 id="journal-clear-heading">確定清除探索資料？</h3><p>這會刪除本機的所有據點發現與探索完成紀錄。五站主線進度、車輛位置與操作引導設定不受影響。</p>
      <div className="journal-actions"><button ref={cancelClear} type="button" onClick={()=>setConfirmClear(false)}>取消，保留日記</button><button type="button" className="journal-danger" onClick={()=>{explorationStore.getState().clearJournal(true);setSelection(null);setFeedback('探索日記已清除，主線進度不變。');setConfirmClear(false);}}>確定清除探索資料</button></div>
    </section>:<>
      <div className="journal-counts" aria-label="探索進度"><span>總據點 <strong data-journal-count="total">{explorationLocations.length}</strong></span><span>已發現 <strong data-journal-count="discovered">{discovered}</strong></span><span>已完成 <strong data-journal-count="completed">{completed}</strong></span></div>
      <p className="journal-explainer">首次據點卡需要在互動範圍內完全停穩；已完成的日記可隨時重讀。閱讀時暫停駕駛，移動或停車前請先關閉日記。探索紀錄與五站主線分開，重置旅程會保留日記。</p>
      {storageNotice&&<p className="journal-storage-note" role="status">{storageNotice}</p>}
      {feedback&&<p className="journal-feedback" role="status">{feedback}</p>}
      {selected&&selection?<section className="journal-location-card" data-card-id={selected.id} data-card-mode={selection.mode==='read'?'journal-entry':'interaction'} aria-labelledby="journal-card-heading">
        <span className="journal-category">{categoryLabels[selected.category]} · {selection.mode==='read'?'已收錄的日記':'據點互動卡'}</span><h3 id="journal-card-heading">{selected.name}</h3><p>{selected.description}</p>
        <div className="journal-story"><h4>{selected.journalTitle}</h4><p>{selected.journalContent}</p></div>
        <p className="scenario-note">遊戲情境／暫定文案，非實際地址或服務承諾。</p>
        <div className="journal-actions"><button type="button" onClick={()=>{explorationStore.getState().endInteraction();setSelection(null);setFeedback('');}}>回據點清單</button>
        {selection.mode==='interaction'?<button type="button" className="journal-primary" onClick={()=>{
          if(explorationStore.getState().completeInteraction(selected.id)){setFeedback('已完成探索，這一站已收進你的日記。');setSelection({id:selected.id,mode:'read'});}
          else setFeedback(explorationStore.getState().interactionProblem(selected.id)??'互動已結束，請返回據點清單重新開啟。');
        }}>確認並記錄探索完成</button>:<span className="journal-completed">✓ 已完成探索，可再次閱讀</span>}</div>
      </section>:<>
        <div className="journal-filters"><div className="journal-categories" role="group" aria-label="據點分類">{(['all','daycare','service'] as const).map(value=><button key={value} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)}>{value==='all'?'全部':categoryLabels[value]}</button>)}</div>
        <label>日記狀態 <select aria-label="日記狀態" value={status} onChange={event=>setStatus(event.target.value as typeof status)}><option value="all">全部狀態</option><option value="undiscovered">未發現</option><option value="discovered">已發現（未完成）</option><option value="completed">已完成</option></select></label></div>
        <p className="journal-map-key">地圖探索標記：? 未發現 · ◇ 已發現 · ✓ 已完成。金色導航與數字仍代表五站主線。</p>
        <div className="journal-list">{list.map(location=>{
          const entry=entries[location.id],state=explorationStatus(entry),problem=entry?explorationStore.getState().interactionProblem(location.id):'繼續自由探索，靠近據點即可發現。';
          return <article className={'journal-list-card is-'+state} key={location.id} data-exploration-id={location.id}><span className="journal-category">{categoryLabels[location.category]} · {statusLabels[state]}</span><h3>{entry?location.name:`? 未發現的${location.category==='daycare'?'日照':'服務'}據點 ${explorationLocations.indexOf(location)+1}`}</h3>
            {state==='completed'?<><p>這一站的探索筆記已收錄。</p><button type="button" onClick={()=>pick(location.id)}>重讀日記</button></>:<><p>{entry&&<>距互動點約 {Math.round(Math.hypot(x-location.position[0],z-location.position[1]))} m。<br/></>}{problem??'已在互動範圍內停穩，可以查看據點卡。'}</p><button type="button" data-action="interact" disabled={!!problem} onClick={()=>pick(location.id)}>查看據點卡</button></>}
          </article>;
        })}</div>{!list.length&&<p className="journal-empty">這個篩選條件下還沒有紀錄。繼續探索城市吧。</p>}
        <button type="button" className="journal-clear" onClick={()=>setConfirmClear(true)}>清除探索資料…</button>
      </>}
    </>}
  </dialog>;
}
