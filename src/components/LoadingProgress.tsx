import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';

export function useStartupLoading() {
  const { active, loaded, total, errors } = useProgress();
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => { setSlow(true); setReady(true); }, 15000);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    if (ready || active || total === 0) return;
    // Let dependent textures and decoder files join the loading manager first.
    const timer = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timer);
  }, [active, total, loaded, ready]);
  return { ready, slow, dismissSlow:()=>setSlow(false), loaded, total, errors: errors.length, progress: total ? Math.min(99, Math.floor(loaded/total*100)) : 0 };
}

export function LoadingProgress({ loading }: { loading: ReturnType<typeof useStartupLoading> }) {
  if(loading.ready)return loading.slow?<div className="loading-slow" role="status">載入較慢，已先以簡化場景啟動；其他資源會繼續載入。<button type="button" onClick={loading.dismissSlow} aria-label="關閉載入提示">關閉</button></div>:null;
  return <section className="loading-progress" aria-labelledby="loading-title" aria-busy="true">
    <div><span className="eyebrow">LOHAS RUSH</span><h2 id="loading-title">正在準備你的城市</h2>
      <p>載入模型、材質與天空，完成後就能出發。</p>
      <progress aria-label="遊戲載入進度" max={100} value={loading.progress} />
      <p role="status">{loading.total?`${loading.progress}% · 已處理 ${loading.loaded} / ${loading.total} 個資源`:'正在建立 3D 場景…'}</p>
      {loading.errors>0&&<p>部分資源未能載入，會使用簡化模型繼續遊玩。</p>}
    </div>
  </section>;
}
