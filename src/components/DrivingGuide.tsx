import {useEffect, useRef} from 'react';

const storageKey='lohas-rush:driving-guide:v1';
export function needsDrivingGuide() {
  try { return localStorage.getItem(storageKey)!=='seen'; } catch { return true; }
}
export function DrivingGuide({touch, onClose}:{touch:boolean;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const finish=()=>{
    try {localStorage.setItem(storageKey,'seen');} catch { /* Play remains available when storage is blocked. */ }
    onClose();
  };
  useEffect(()=>{
    const modal=dialog.current;
    window.dispatchEvent(new Event('blur'));
    modal?.showModal();
    return ()=>modal?.close();
  },[]);
  return <dialog className="driving-guide" ref={dialog} aria-labelledby="guide-title" aria-describedby="guide-intro" onCancel={event=>{event.preventDefault();finish();}}>
    <span className="eyebrow">LOHAS RUSH · 操作引導</span>
    <h2 id="guide-title">開車探索城市，從每一站認識樂活。</h2>
    <p id="guide-intro">自由駕駛，或跟著金色導航依序走訪大和、安南、龍山、義合、新營。駛入圓環會自動記錄抵達；奶奶上下車是可自由選擇的體驗。</p>
    <h3>{touch?'手機／平板觸控':'桌機鍵盤與滑鼠'}</h3>
    <ol className="guide-steps">
      <li><strong>先試著出發</strong><span>{touch?'按住右下「油門」前進，「倒車」後退；用左側方向鍵或方向搖桿轉向。':'W／↑ 加速，S／↓ 減速後倒車；A、D／←、→ 左右轉向。'}</span></li>
      <li><strong>慢慢靠近目的地</strong><span>{touch?'按住「煞車」停穩。金色路線只提供引導，你也可以自由探索。':'按住 Space 煞車停穩。金色路線只提供引導，你也可以自由探索。'}</span></li>
      <li><strong>停車後再互動</strong><span>{touch?'完全停車後，點「奶奶下車」。探索後回到車尾上車標記，停下並點「奶奶上車」。':'完全停車後，按 E 或「奶奶下車」。探索後回到車尾上車標記，停下再按 E 上車。'}</span></li>
    </ol>
    <p className="guide-tools">{touch?'資訊欄與地圖都能收合；「重新開始旅程」會清空五站進度。旋轉手機時，觸控按鈕會自動調整位置。':'C 切換鏡頭；滑鼠右鍵拖曳環繞、滾輪縮放；R 重置車輛與五站進度。'}</p>
    <p className="scenario-note">虛構城市的遊戲體驗，建築、服務設施與路線皆為情境示意。</p>
    <div className="guide-actions"><button type="button" onClick={finish}>略過引導</button><button type="button" className="guide-start" onClick={finish} autoFocus>開始探索</button></div>
    <small>引導開啟期間暫停駕駛與接送動作；之後可按「操作說明」再次查看。</small>
  </dialog>;
}
