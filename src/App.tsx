import { Canvas } from '@react-three/fiber';
import { Component, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { City } from './game/City';
import { Car } from './game/Car';
import { PassengerControls } from './game/PassengerControls';
import { TouchControls } from './game/TouchControls';
import { RouteMap } from './game/RouteMap';
import { SPAWN } from './data/roadNetwork';
import { servicePoints } from './data/services';
import { locations } from './data/city';
import { selectVirtualCamera } from './game/camera/virtualCameras';
import { useGame } from './stores/game';
import { DrivingGuide, needsDrivingGuide } from './components/DrivingGuide';
import { ExplorationJournal, ExplorationNotices } from './components/ExplorationJournal';

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

function CameraSwitch() {
  const mode = useGame(s => s.cameraMode), cycle = useGame(s => s.cycleCamera);
  const servicing = useGame(s => s.transferPhase !== 'stowed');
  const outside=useGame(s=>s.transferPhase==='outside');
  const label = outside ? '輪椅跟隨' : servicing ? '接送視角' : selectVirtualCamera(mode).label;
  return <button type="button" className="camera-switch" disabled={servicing} onClick={event => { cycle(); if (event.detail > 0) event.currentTarget.blur(); }} aria-label={outside ? '奶奶輪椅跟隨鏡頭' : servicing ? '接送視角，收妥後可切換鏡頭' : `切換鏡頭，目前為${label}`} title={outside ? '輪椅模式自動跟隨' : servicing ? '接送完成後可切換' : '切換跟車／高視角（C）'}>鏡頭：{label}</button>;
}

function HUD({touch, onHelp, onJournal}:{touch:boolean;onHelp:()=>void;onJournal:()=>void}) {
  const [missionCollapsed, setMissionCollapsed] = useState(touch);
  const speed = useGame(s => s.speed);
  const phase = useGame(s => s.transferPhase);
  const outside=useGame(s=>s.transferPhase==='outside');
  const distance = useGame(s => s.distance);
  const mission = useGame(s => s.missionIndex);
  const completed = useGame(s => s.completed);
  const reset = useGame(s => s.reset);
  const lastArrival = completed ? locations[locations.length-1] : mission>0 ? locations[mission-1] : null;
  const atArrival = useGame(s=>!!lastArrival && Math.hypot(s.parkedBusX-lastArrival.arrival[0],s.parkedBusZ-lastArrival.arrival[1])<=12);
  const nearbyService = useGame(s => servicePoints.find(service => Math.hypot(s.x - service.arrival[0], s.z - service.arrival[1]) <= 8));
  const guidance = completed
    ? '五站任務完成，謝謝你一路相伴。你已將關懷送到城市的每一站。想再出發，可以重新開始旅程。'
    : outside
      ? touch ? '使用方向控制與「前進／後退」移動奶奶輪椅。回到車尾上車標記，停下後點「奶奶上車」。' : '使用 WASD／方向鍵移動奶奶輪椅。回到巴士車尾的上車標記，停下後按「奶奶上車」或 E。'
      : phase !== 'stowed'
        ? '接送進行中，請等候升降平台與司機完成動作，再依畫面提示繼續。'
        : atArrival
          ? speed>0 ? '已記錄抵達。如需體驗奶奶下車，請先煞車至 0 km/h，並保留車後空間。' : '車輛已停穩，可按「奶奶下車」體驗互動，也可繼續自由探索或前往下一站。'
        : distance <= 18
          ? '已接近目的地。慢慢駛入金色圓環，即可記錄抵達並更新下一站。'
          : locations[mission].description;
  return <>
    <header><a className="brand" href="./"><span className="brand-mark">樂</span><div><h1>樂活狂飆</h1><small className="brand-subtitle">LOHAS RUSH</small></div></a><div className="header-actions"><div className="city-tag"><i /> 虛構城市・遊戲情境 <span>V0.2-A</span></div><button type="button" className="guide-help journal-toggle" onClick={onJournal}>探索日記</button><button type="button" className="guide-help" onClick={onHelp}>操作說明</button></div></header>
    <aside className={`mission-panel${missionCollapsed ? ' is-collapsed' : ''}`} aria-label="服務路線">
      <div className="mission-summary">
        <div aria-hidden={missionCollapsed}><strong>{completed ? '五站任務完成' : `下一站：${locations[mission].name}`}</strong><small>{completed ? `${locations.length} 站皆已抵達` : `第 ${mission + 1} / ${locations.length} 站 · ${distance} m`}</small></div>
        <button type="button" className="mission-toggle" aria-label={missionCollapsed ? '展開資訊欄' : '縮小資訊欄'} aria-expanded={!missionCollapsed} aria-controls="mission-details" onClick={() => setMissionCollapsed(value => !value)}>{missionCollapsed ? '展開' : '縮小'}<span aria-hidden="true">{missionCollapsed ? '›' : '‹'}</span></button>
      </div>
      <div id="mission-details" aria-hidden={missionCollapsed}>
      <div className="eyebrow">TODAY’S DRIVE <span>{completed ? locations.length : mission} / {locations.length} 已抵達</span></div>
      <h2>自由駕駛，探索樂活城市。</h2>
      <p className="journey-intro">開著車自由探索城市，認識樂活集團的服務據點與長照生態系。五站據點任務可沿金色路線依序完成；停車後也可體驗奶奶上下車。</p>
      <p className="scenario-note">虛構城市的遊戲體驗；服務設施、建築與路線皆為情境示意，不代表真實服務資訊。</p>
      <div className="objective" role="status"><span>{completed ? '旅程完成' : outside ? '輪椅探索' : phase !== 'stowed' ? '接送中' : atArrival ? '已抵達' : distance <= 18 ? '接近目的地' : '出發指引'}</span><p className="mission-guidance">{guidance}</p>{lastArrival && <small className="arrival-note">{atArrival?'已抵達':'最近抵達'}：{lastArrival.name}。{completed?'五站皆已記錄。':'下一站已更新。'}</small>}{!completed && <small>依序抵達五站即可完成任務 · 距下一站直線約 {distance} m</small>}</div>
      <div className="route-list">{locations.map((l, i) => <div key={l.id} className={`route-stop ${i === mission && !completed ? 'active' : ''} ${i < mission || completed ? 'visited' : ''}`}><span className="stop-number">{i < mission || completed ? '✓' : `0${i + 1}`}</span><div><strong>{l.name}</strong><small>{i < mission || completed ? '已抵達' : i === mission ? '目前目的地' : '接續行程'}</small></div></div>)}</div>
      {nearbyService && <div className="service-note"><strong>附近情境據點・{nearbyService.name}</strong><p>{nearbyService.description}</p></div>}
      <button onClick={reset}>重新開始旅程 <kbd>R</kbd></button>
      </div>
    </aside>
    <section className="destination-strip" aria-label="目前目的地與下一步"><div><strong>{completed?'五站任務完成':`下一站：${locations[mission].name}`}</strong><span>{completed?'可自由探索或重新開始':`直線距離 ${distance} m`}</span><small>{outside?'回到車尾標記，停下後點「奶奶上車」':phase!=='stowed'?'接送進行中，請等候動作完成':atArrival?speed>0?'已抵達，請煞車至 0 km/h 後互動':'已抵達並停穩，可點「奶奶下車」':completed?'謝謝你一路相伴。':distance<=18?'接近目的地，慢慢駛入金色圓環':'自由探索，或沿金色路線前往下一站'}</small></div><button type="button" aria-label="重新開始旅程" onClick={reset}>重來</button></section>
    <div className="drive-caption"><span>EXPLORE AT YOUR OWN PACE</span><p>慢慢開，把關懷送到每一站。</p></div>
    <section className="speed-panel" aria-label={`${outside?'輪椅速度':'車速'} ${speed} 公里每小時`}><span className="eyebrow">{outside?'WHEELCHAIR · 奶奶':'SERVICE VAN · 01'}</span><div><strong>{String(speed).padStart(2, '0')}</strong><span>km/h</span></div><div className="speed-track"><i style={{ width: `${Math.min(speed / (outside?6.5:120) * 100, 100)}%` }} /></div><small>{outside?'輪椅探索・巴士停駐':completed ? '自由探索中' : '樂活服務車 · 行程進行中'}</small><CameraSwitch /></section>
    <footer><span className="keyboard-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 方向鍵 <span>{outside?'輪椅移動':'駕駛'}</span></span><span><kbd>Space</kbd> {outside?'停下':'煞車'}</span><span><kbd>C</kbd> 切換鏡頭</span><span><kbd>R</kbd> 重置車輛與行程</span><span className="mouse-look-hint">右鍵拖曳：環繞視角・滾輪縮放</span><span className="footer-note">單人 · 鍵盤／觸控操作</span></footer>
    <TouchControls />
    <PassengerControls />
    <RouteMap />
  </>;
}
export default function App() {
  const [overlay,setOverlay]=useState<'guide'|'journal'|null>(()=>needsDrivingGuide()?'guide':null);
  const guideOpen=overlay==='guide';
  useLayoutEffect(()=>{
    useGame.getState().setControlsPaused(overlay!==null);
    return ()=>useGame.getState().setControlsPaused(false);
  },[overlay]);
  const changeOverlay=(value:'guide'|'journal'|null)=>{useGame.getState().setControlsPaused(value!==null);setOverlay(value);};
  const [mobileGraphics, setMobileGraphics] = useState(() => window.matchMedia('(any-pointer: coarse), (max-width: 850px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(any-pointer: coarse), (max-width: 850px)');
    const change = () => setMobileGraphics(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  const [hasWebGL] = useState(supported);
  const [contextLost, setContextLost] = useState(false);
  return <main data-guide-state={hasWebGL&&!contextLost&&guideOpen?'open':'closed'}><GraphicsBoundary>{hasWebGL && !contextLost ? <><Canvas shadows={!mobileGraphics} dpr={mobileGraphics ? 1 : [1, 1.5]} gl={{ antialias: !mobileGraphics }} camera={{ position: [SPAWN.x, 9, SPAWN.z + 14], fov: 58, near: 0.1, far: 320 }} fallback={<GraphicsFallback />} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setContextLost(true); }, { once: true }); }}><City /><Car lowDetail={mobileGraphics} /></Canvas><HUD touch={mobileGraphics} onHelp={()=>changeOverlay('guide')} onJournal={()=>changeOverlay('journal')} />{guideOpen&&<DrivingGuide touch={mobileGraphics} onClose={()=>changeOverlay(null)} />}{overlay==='journal'&&<ExplorationJournal onClose={()=>changeOverlay(null)} />}<ExplorationNotices /></> : <GraphicsFallback />}</GraphicsBoundary></main>;
}
