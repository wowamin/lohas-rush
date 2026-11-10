import { useEffect, useState } from 'react';
import { useVisual } from '../stores/visual';
import { useGame } from '../stores/game';
import { isQuality } from '../game/rendering/quality';
import type { RenderTelemetry } from '../game/rendering/Lighting';

export function GraphicsControls() {
  const visual=useVisual(),moving=useGame(s=>s.speed!==0||s.transferPhase!=='stowed');
  const [stats,setStats]=useState<RenderTelemetry>();
  useEffect(()=>{if(!visual.panelOpen)return;const timer=setInterval(()=>setStats(window.__LOHAS_RENDERING__?{...window.__LOHAS_RENDERING__}:undefined),750);return()=>clearInterval(timer);},[visual.panelOpen]);
  const showcase=visual.viewMode==='showcase';
  return <section className={`graphics-controls${visual.panelOpen?' is-open':''}`} aria-label="畫面設定">
    <div className="graphics-toolbar">
      <button type="button" aria-expanded={visual.panelOpen} aria-controls="graphics-settings" onClick={visual.togglePanel}>畫面設定</button>
      <button type="button" className="showcase-toggle" disabled={!showcase&&moving} title={!showcase&&moving?'請先停車並完成接送流程':undefined} onClick={()=>visual.setViewMode(showcase?'game':'showcase')}>{showcase?'返回駕駛':'建築展示'}</button>
    </div>
    {visual.panelOpen&&<div id="graphics-settings">
      <label>畫質<select aria-label="畫質" value={visual.quality} onChange={e=>{if(isQuality(e.target.value))visual.setQuality(e.target.value);}}><option value="low">Low · 輕量</option><option value="medium">Medium · 平衡</option><option value="high">High · 精緻</option></select></label>
      <label className="graphics-check"><input type="checkbox" checked={visual.ao} disabled={visual.quality==='low'} onChange={e=>visual.setAO(e.target.checked)} />環境遮蔽 AO</label>
      <label className="graphics-check"><input type="checkbox" checked={visual.bloom} disabled={visual.quality!=='high'} onChange={e=>visual.setBloom(e.target.checked)} />柔和高光 Bloom</label>
      <p className="graphics-stats" aria-live="off">{stats?`${Math.round(stats.fps)} FPS · ${stats.calls} draw calls · ${stats.geometries} 幾何 · ${stats.textures} 貼圖`:'正在取樣畫面…'}</p>
      {stats?.environment==='fallback'&&<p>天空環境載入失敗，已保留基本日光。</p>}
    </div>}
    {showcase&&<div className="showcase-settings">
      <label>展示建築<select aria-label="展示建築" value={visual.building} onChange={e=>visual.setBuilding(e.target.value)}><option value="headquarters">樂活總部</option><option value="daihe">大和日照中心</option><option value="annan">安南日照中心</option><option value="xinying">新營日照中心</option></select></label>
      <p>拖曳環繞 · 右鍵平移 · 滾輪縮放<br/>展示期間暫停駕駛與接送</p>
      <button type="button" onClick={visual.requestCapture}>擷取 PNG 畫面</button><span role="status">{visual.captureStatus}</span>
    </div>}
  </section>;
}
