import { Canvas } from '@react-three/fiber';
import { Component, useState, type ReactNode } from 'react';
import { City } from './game/City';
import { Car } from './game/Car';
import { locations } from './data/city';
import { useGame } from './stores/game';

function supported() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
function GraphicsFallback() {
  return <div className="error"><span>LOHAS RUSH</span><h2>暫時無法啟動 3D 城市</h2><p>請使用支援 WebGL 2 的桌機瀏覽器，開啟硬體加速後重新載入。</p><button onClick={() => window.location.reload()}>重新載入</button></div>;
}
class GraphicsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <GraphicsFallback /> : this.props.children; }
}

function HUD() {
  const speed = useGame(s => s.speed);
  const distance = useGame(s => s.distance);
  const mission = useGame(s => s.missionIndex);
  const completed = useGame(s => s.completed);
  const reset = useGame(s => s.reset);
  return <>
    <header><a className="brand" href="./"><span className="brand-mark">樂</span><div><h1>樂活狂飆</h1><small>LOHAS RUSH</small></div></a><div className="city-tag"><i /> 樂活虛構城市 <span>V0.1</span></div></header>
    <aside className="mission-panel" aria-label="服務路線">
      <div className="eyebrow">TODAY’S DRIVE <span>01 — 03</span></div>
      <h2>把關懷，送進城市。</h2><p className="intro">一輛服務車，三站暖心旅程。</p>
      <div className="route-list">{locations.map((l, i) => <div key={l.id} className={`route-stop ${i === mission && !completed ? 'active' : ''} ${i < mission || completed ? 'visited' : ''}`}><span className="stop-number">{i < mission || completed ? '✓' : `0${i + 1}`}</span><div><strong>{l.name}</strong><small>{i < mission || completed ? '已抵達' : i === mission ? '目前目的地' : '接續行程'}</small></div></div>)}</div>
      <div className="objective" role="status"><span>{completed ? '旅程完成' : '駕駛提示'}</span><p>{completed ? '三個服務據點皆已抵達，謝謝你將關懷送到每一站。' : locations[mission].description}</p>{!completed && <small>駛入金色圓環即可完成抵達 · 距離約 {distance} m</small>}</div>
      <button onClick={reset}>重新開始 <kbd>R</kbd></button>
    </aside>
    <div className="drive-caption"><span>EXPLORE AT YOUR OWN PACE</span><p>慢一點，也是一種樂活。</p></div>
    <section className="speed-panel" aria-label={`車速 ${speed} 公里每小時`}><span className="eyebrow">SERVICE VAN · 01</span><div><strong>{String(speed).padStart(2, '0')}</strong><span>km/h</span></div><div className="speed-track"><i style={{ width: `${Math.min(speed / 65 * 100, 100)}%` }} /></div><small>{completed ? '自由探索中' : '樂活服務車 · 行程進行中'}</small></section>
    <footer><span className="keyboard-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 方向鍵 <span>駕駛</span></span><span><kbd>Space</kbd> 煞車</span><span><kbd>R</kbd> 重置車輛與行程</span><span className="footer-note">單人 · 桌機鍵盤操作</span></footer>
  </>;
}
export default function App() {
  const [hasWebGL] = useState(supported);
  const [contextLost, setContextLost] = useState(false);
  return <main><GraphicsBoundary>{hasWebGL && !contextLost ? <><Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 9, 27], fov: 58, near: 0.1, far: 220 }} fallback={<GraphicsFallback />} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setContextLost(true); }, { once: true }); }}><City /><Car /></Canvas><HUD /></> : <GraphicsFallback />}</GraphicsBoundary></main>;
}
