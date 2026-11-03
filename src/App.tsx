import { Canvas } from '@react-three/fiber';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { City } from './game/City';
import { Car } from './game/Car';
import { TouchControls } from './game/TouchControls';
import { RouteMap } from './game/RouteMap';
import { SPAWN } from './data/roadNetwork';
import { servicePoints } from './data/services';
import { locations } from './data/city';
import { selectVirtualCamera } from './game/camera/virtualCameras';
import { useGame } from './stores/game';

function supported() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
function GraphicsFallback() {
  return <div className="error"><span>LOHAS RUSH</span><h2>暫時無法啟動 3D 城市</h2><p>請使用支援 WebGL 2 的瀏覽器，開啟硬體加速後重新載入。</p><button onClick={() => window.location.reload()}>重新載入</button></div>;
}
class GraphicsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <GraphicsFallback /> : this.props.children; }
}

function HUD() {
  const [missionCollapsed, setMissionCollapsed] = useState(false);
  const speed = useGame(s => s.speed);
  const distance = useGame(s => s.distance);
  const mission = useGame(s => s.missionIndex);
  const completed = useGame(s => s.completed);
  const reset = useGame(s => s.reset);
  const cameraMode = useGame(s => s.cameraMode), cycleCamera = useGame(s => s.cycleCamera);
  const nearbyService = useGame(s => servicePoints.find(service => Math.hypot(s.x - service.arrival[0], s.z - service.arrival[1]) <= 8));
  return <>
    <header><a className="brand" href="./"><span className="brand-mark">樂</span><div><h1>樂活狂飆</h1><small>LOHAS RUSH</small></div></a><div className="city-tag"><i /> 樂活虛構城市 <span>V1</span></div></header>
    <aside className={`mission-panel${missionCollapsed ? ' is-collapsed' : ''}`} aria-label="服務路線">
      <div className="mission-summary">
        <div aria-hidden={missionCollapsed}><strong>{completed ? '旅程完成' : locations[mission].name}</strong><small>{completed ? `${locations.length} 站服務已完成` : `第 ${mission + 1} / ${locations.length} 站 · ${distance} m`}</small></div>
        <button type="button" className="mission-toggle" aria-label={missionCollapsed ? '展開資訊欄' : '縮小資訊欄'} aria-expanded={!missionCollapsed} aria-controls="mission-details" onClick={() => setMissionCollapsed(value => !value)}>{missionCollapsed ? '展開' : '縮小'}<span aria-hidden="true">{missionCollapsed ? '›' : '‹'}</span></button>
      </div>
      <div id="mission-details" aria-hidden={missionCollapsed}>
      <div className="eyebrow">TODAY’S DRIVE <span>{completed ? locations.length : mission} / {locations.length} 已抵達</span></div>
      <h2>五站日照，環城相伴。</h2><p className="intro">大和 → 安南 → 龍山 → 義合 → 新營</p>
      <div className="route-list">{locations.map((l, i) => <div key={l.id} className={`route-stop ${i === mission && !completed ? 'active' : ''} ${i < mission || completed ? 'visited' : ''}`}><span className="stop-number">{i < mission || completed ? '✓' : `0${i + 1}`}</span><div><strong>{l.name}</strong><small>{i < mission || completed ? '已抵達' : i === mission ? '目前目的地' : '接續行程'}</small></div></div>)}</div>
      <div className="objective" role="status"><span>{completed ? '旅程完成' : '駕駛提示'}</span><p>{completed ? '五間日照中心皆已抵達，謝謝你將關懷送到每一站。' : locations[mission].description}</p>{!completed && <small>駛入金色圓環即可完成抵達 · 直線距離約 {distance} m</small>}</div>
      {nearbyService && <div className="service-note"><strong>附近服務・{nearbyService.name}</strong><p>{nearbyService.description}</p></div>}
      <button onClick={reset}>重新開始 <kbd>R</kbd></button>
      </div>
    </aside>
    <div className="drive-caption"><span>EXPLORE AT YOUR OWN PACE</span><p>慢一點，也是一種樂活。</p></div>
    <section className="speed-panel" aria-label={`車速 ${speed} 公里每小時`}><span className="eyebrow">SERVICE VAN · 01</span><div><strong>{String(speed).padStart(2, '0')}</strong><span>km/h</span></div><div className="speed-track"><i style={{ width: `${Math.min(speed / 65 * 100, 100)}%` }} /></div><small>{completed ? '自由探索中' : '樂活服務車 · 行程進行中'}</small><button type="button" className="camera-switch" onClick={event => { cycleCamera(); if (event.detail > 0) event.currentTarget.blur(); }} aria-label={`切換鏡頭，目前為${selectVirtualCamera(cameraMode).label}`} title="切換跟車／高視角（C）">鏡頭：{selectVirtualCamera(cameraMode).label}</button></section>
    <footer><span className="keyboard-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 方向鍵 <span>駕駛</span></span><span><kbd>Space</kbd> 煞車</span><span><kbd>C</kbd> 切換鏡頭</span><span><kbd>R</kbd> 重置車輛與行程</span><span className="footer-note">單人 · 鍵盤／觸控操作</span></footer>
    <TouchControls />
    <RouteMap />
  </>;
}
export default function App() {
  const [mobileGraphics, setMobileGraphics] = useState(() => window.matchMedia('(any-pointer: coarse), (max-width: 850px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(any-pointer: coarse), (max-width: 850px)');
    const change = () => setMobileGraphics(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  const [hasWebGL] = useState(supported);
  const [contextLost, setContextLost] = useState(false);
  return <main><GraphicsBoundary>{hasWebGL && !contextLost ? <><Canvas shadows={!mobileGraphics} dpr={mobileGraphics ? 1 : [1, 1.5]} gl={{ antialias: !mobileGraphics }} camera={{ position: [SPAWN.x, 9, SPAWN.z + 14], fov: 58, near: 0.1, far: 320 }} fallback={<GraphicsFallback />} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setContextLost(true); }, { once: true }); }}><City /><Car lowDetail={mobileGraphics} /></Canvas><HUD /></> : <GraphicsFallback />}</GraphicsBoundary></main>;
}
