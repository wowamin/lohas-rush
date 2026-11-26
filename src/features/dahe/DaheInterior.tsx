import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type MutableRefObject, type PointerEvent } from 'react';
import { BoxGeometry, BufferGeometry, Group, MeshStandardMaterial, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { constrainCamera } from '../../game/camera/cameraCollision';
import { MouseOrbit } from '../../game/camera/MouseOrbit';
import { bindInteriorOrbit, cameraRelativeMovement, INTERIOR_AIM_HEIGHT } from './interiorCamera';
import { createPassengerModel } from '../../game/vehicle/passengerModels';
import { disposeModels } from '../../game/assets/GameAssets';
import { BLOCKERS, INTERIOR_BOXES, START, TABLE_POSITIONS, ZONES, nearZone, parseProgress, stepWalker, type ZoneId } from './interior';
import { CENTER_INTERIORS, type CenterInterior } from './centers';
import './dahe.css';

type Player = { x: number; z: number; angle: number };
type Controls = { keys: Set<string>; pointers: Map<number, string>; locked: boolean };
const clear = (controls: Controls) => { controls.keys.clear(); controls.pointers.clear(); };
const isDown = (controls: Controls, ...keys: string[]) => keys.some(key => controls.keys.has(key) || [...controls.pointers.values()].includes(key));
const SHARED_ZONE_TEXT: Record<ZoneId, string> = {
  reception: '在入口停一停，慢慢熟悉環境。這個共用示意空間，從一聲問候開始。',
  activity: '木桌和深色座椅圍出共享的活動空間，中央走道留給奶奶自在穿行。此為共用遊戲配置。',
  rest: '深色休閒椅、藍色捲簾與簡化按摩椅，組成安靜角落。此為共用示意，並非本館實景。',
  kitchen: '淺木櫃、白色檯面、水槽和冰箱，讓空間帶著日常氣息。家具與位置沿用共用示意配置。',
  rehab: '窗邊的平行扶手僅供參觀互動，未模擬療程或提供訓練指引。此為共用示意配置。',
};

// Merge the repeated furniture into one mesh per colour, using the same box
// definitions as collisions. The supplied photos remain outside the web bundle.
function Furniture() {
  const [batches, setBatches] = useState<{ geometry: BufferGeometry; material: MeshStandardMaterial }[]>([]);
  useEffect(() => {
    const groups = new Map<string, BufferGeometry[]>();
    for (const box of INTERIOR_BOXES) {
      const geometry = new BoxGeometry(...box.size).translate(...box.position);
      const list = groups.get(box.color) ?? []; list.push(geometry); groups.set(box.color, list);
    }
    const built = [...groups].map(([color, geometries]) => {
      const geometry = mergeGeometries(geometries)!;
      geometries.forEach(item => item.dispose());
      return { geometry, material: new MeshStandardMaterial({ color, roughness: .85 }) };
    });
    setBatches(built);
    return () => built.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); });
  }, []);
  return <group name="dahe-furniture">{batches.map((batch, i) => <mesh key={i} geometry={batch.geometry} material={batch.material} castShadow receiveShadow dispose={null} />)}</group>;
}

function Walker({ player, controls, locked, overview, reset, cameraReset, onPosition }: {
  player: MutableRefObject<Player>; controls: MutableRefObject<Controls>; locked: boolean; overview: boolean; reset: number; cameraReset: number; onPosition: (pose: Player) => void;
}) {
  const group = useRef<Group>(null), { camera, gl } = useThree();
  const clock = useRef({ accumulator: 0, report: 0 });
  const orbit = useMemo(() => new MouseOrbit(), []);
  const scratch = useMemo(() => ({ desired: new Vector3(), focus: new Vector3(), target: { x: 0, z: 0, angle: 0, speed: 0 } }), []);
  useEffect(() => bindInteriorOrbit(gl.domElement, orbit, () => ({ position: camera.position, x: player.current.x, z: player.current.z }), () => !locked && !overview && !controls.current.locked && !document.hidden), [gl, orbit, camera, player, controls, locked, overview, reset, cameraReset]);
  useLayoutEffect(() => { orbit.reset(); }, [orbit, reset, cameraReset, overview]);
  useEffect(() => {
    const host = group.current!, model = createPassengerModel('grandma');
    model.scale.setScalar(.9); model.position.y = .003;
    host.add(model);
    return () => { host.remove(model); disposeModels([model]); };
  }, []);
  useLayoutEffect(() => {
    player.current = { ...START }; clock.current = { accumulator: 0, report: 0 };
    camera.position.set(0, 7, 13.5); camera.lookAt(0, 1, START.z);
    onPosition({ ...player.current });
  }, [reset, camera, player, onPosition]);
  useFrame((_, delta) => {
    const time = clock.current, input = controls.current, pose = player.current;
    let dx = 0, dz = 0;
    if (!input.locked && !locked && !overview && !document.hidden) {
      dx = Number(isDown(input, 'KeyD', 'ArrowRight')) - Number(isDown(input, 'KeyA', 'ArrowLeft'));
      dz = Number(isDown(input, 'KeyS', 'ArrowDown')) - Number(isDown(input, 'KeyW', 'ArrowUp'));
    }
    time.accumulator += Math.min(delta, .1);
    let steps = 0;
    const direction = cameraRelativeMovement(dx, dz, orbit.active ? orbit.yaw : 0);
    while (time.accumulator >= 1 / 120 && steps++ < 12) {
      if (!isDown(input, 'Space')) stepWalker(pose, direction.x, direction.z, isDown(input, 'ShiftLeft', 'ShiftRight'), 1 / 120);
      time.accumulator -= 1 / 120;
    }
    time.accumulator = Math.max(0, Math.min(time.accumulator, 1 / 120));
    if (group.current) {
      group.current.position.set(pose.x, 0, pose.z); group.current.rotation.y = pose.angle;
    }
    const { desired, focus, target } = scratch;
    if (overview) { focus.set(0, 0, 0); desired.set(0, 23, 12); }
    else {
      focus.set(pose.x, INTERIOR_AIM_HEIGHT, pose.z); desired.set(pose.x, 6.8, pose.z + 7.6);
      target.x = pose.x; target.z = pose.z;
      if (orbit.active) orbit.apply(desired, target, INTERIOR_AIM_HEIGHT);
      constrainCamera(focus, desired, BLOCKERS, .18);
    }
    camera.position.lerp(desired, 1 - Math.exp(-6 * Math.min(delta, .1)));
    if (!overview) constrainCamera(focus, camera.position, BLOCKERS, .18);
    camera.lookAt(focus);
    time.report += delta;
    if (time.report >= .1) { time.report = 0; onPosition({ ...pose }); }
  });
  return <group ref={group} name="dahe-walker" />;
}
class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="dahe-error"><h2>暫時無法顯示 3D 預覽</h2><p>請開啟瀏覽器硬體加速後重新整理。</p><a href={import.meta.env.BASE_URL}>返回城市</a></div> : this.props.children; }
}
function loadProgress(key: string) {
  try { return { ...parseProgress(localStorage.getItem(key)), notice: '' }; }
  catch { return { completed: 0, writable: false, notice: '目前無法儲存，仍可繼續參觀。' }; }
}

export default function DaheInterior({ center = CENTER_INTERIORS[0] }: { center?: CenterInterior }) {
  const zones = useMemo(() => ZONES.map(zone => ({ ...zone, text: center.id === 'daihe' ? zone.text : SHARED_ZONE_TEXT[zone.id] })), [center.id]);
  const zoneAt = (id: ZoneId | null) => zones.find(zone => zone.id === id);
  const [saved] = useState(() => loadProgress(center.progressKey)), [completed, setCompleted] = useState(saved.completed);
  const [notice, setNotice] = useState(saved.notice || (!saved.writable ? '保留較新版本紀錄，本次參觀不覆寫存檔。' : ''));
  const [pose, setPose] = useState<Player>({ ...START });
  const [overview, setOverview] = useState(false), [reset, setReset] = useState(0);
  const [cameraReset, setCameraReset] = useState(0);
  const [interaction, setInteraction] = useState<ZoneId | 'clear' | null>(null);
  const player = useRef<Player>({ ...START }), controls = useRef<Controls>({ keys: new Set(), pointers: new Map(), locked: false });
  const dialog = useRef<HTMLDialogElement>(null), interactButton = useRef<HTMLButtonElement>(null);
  const near = nearZone(pose.x, pose.z), current = zones[completed], shown = interaction === 'clear' ? undefined : zoneAt(interaction);
  useEffect(() => {
    if (!saved.writable) return;
    try { localStorage.setItem(center.progressKey, JSON.stringify({ version: 1, completed })); }
    catch { setNotice('無法儲存參觀進度，仍可繼續遊玩。'); }
  }, [completed, saved.writable, center.progressKey]);
  useLayoutEffect(() => {
    controls.current.locked = !!interaction || overview;
    clear(controls.current);
    if (interaction) dialog.current?.showModal(); else dialog.current?.close();
  }, [interaction, overview]);
  useEffect(() => {
    const input = controls.current;
    const release = () => clear(input);
    const down = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test((event.target as HTMLElement)?.tagName)) return;
      if (input.locked) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        if (overview) return;
        event.preventDefault(); input.keys.add(event.code);
      }
      if (event.code === 'KeyE' && !event.repeat && !overview) {
        event.preventDefault(); const id = nearZone(player.current.x, player.current.z);
        if (id) { release(); input.locked = true; setPose({ ...player.current }); setInteraction(id); }
      }
      if (event.code === 'KeyR' && !event.repeat) { event.preventDefault(); release(); setReset(value => value + 1); }
    };
    const up = (event: KeyboardEvent) => { input.keys.delete(event.code); setPose({ ...player.current }); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('blur', release); window.addEventListener('resize', release);
    document.addEventListener('visibilitychange', release);
    return () => { release(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', release); window.removeEventListener('resize', release); document.removeEventListener('visibilitychange', release); };
  }, [interaction, overview]);
  const openInteraction = (id: ZoneId | 'clear') => { clear(controls.current); controls.current.locked = true; setPose({ ...player.current }); setInteraction(id); };
  const closeDialog = () => { clear(controls.current); controls.current.locked = overview; setInteraction(null); interactButton.current?.focus(); };
  const complete = () => {
    if (current && interaction === current.id && nearZone(player.current.x, player.current.z) === current.id) setCompleted(value => value === completed ? Math.min(ZONES.length, value + 1) : value);
    closeDialog();
  };
  const press = (code: string) => (event: PointerEvent<HTMLButtonElement>) => {
    if (interaction || overview) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); controls.current.pointers.set(event.pointerId, code);
  };
  const release = (event: PointerEvent<HTMLButtonElement>) => { controls.current.pointers.delete(event.pointerId); setPose({ ...player.current }); };
  return <div className="dahe-preview" data-center-id={center.id} data-dahe-mode={overview ? 'overview' : 'walking'} data-dahe-progress={completed} data-dahe-near={near ?? ''} data-player-x={pose.x.toFixed(3)} data-player-z={pose.z.toFixed(3)}>
    <PreviewBoundary><Canvas shadows dpr={[1, 1.25]} camera={{ position: [0, 7, 13.5], fov: 58, near: .08, far: 80 }} gl={{ antialias: true }} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setNotice('3D 畫面已中斷，請重新整理預覽。'); }, { once: true }); }}>
      <color attach="background" args={['#e9e9df']} />
      <hemisphereLight args={['#fff9ee', '#b2bdaf', 2.4]} />
      <directionalLight position={[-4, 12, 5]} intensity={2.5} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15} shadow-camera-near={.5} shadow-camera-far={35} shadow-normalBias={.035} />
      <Furniture />
      <Walker player={player} controls={controls} locked={!!interaction} overview={overview} reset={reset} cameraReset={cameraReset} onPosition={setPose} />
      {!overview && !interaction && Math.hypot(pose.x, pose.z - 6.5) < 2.4 && <Html position={[0, .4, 6.85]} center zIndexRange={[2, 0]} style={{ pointerEvents: 'auto' }}>
        <a className="dahe-exit" href={import.meta.env.BASE_URL} aria-label={`從${center.name}室內返回戶外`} onPointerDown={event => { event.stopPropagation(); clear(controls.current); }} onClick={() => clear(controls.current)}>
          <strong>返回戶外 <span aria-hidden="true">→</span></strong>
          <small>{center.name}門口</small>
        </a>
      </Html>}
      {ZONES.map((zone, index) => <group key={zone.id} position={[zone.point[0], .035, zone.point[1]]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.65, .7, 32]} /><meshBasicMaterial color={index === completed ? '#bc8542' : zone.color} transparent opacity={index === completed ? .95 : .35} depthWrite={false} /></mesh>
        {(overview || zone.id === near || zone.id === current?.id) && <Html position={[0, 2.1, 0]} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}><div className={`dahe-label${index === completed ? ' is-current' : ''}`}>{index < completed ? '✓ ' : `${index + 1} · `}{zone.name}</div></Html>}
      </group>)}
      {overview && <Html position={[-8.5, 2.7, 5.5]} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}><div className="dahe-label">衛浴示意</div></Html>}
    </Canvas></PreviewBoundary>
    <div className="dahe-topbar">
      <div className="dahe-heading"><span className="dahe-mark">{center.mark}</span><div><span className="dahe-eyebrow">LOHAS · A LITTLE EVERYDAY</span><h1>{center.name}<span>室內散策</span></h1><p>從一聲問候開始，慢慢認識每個角落。</p></div></div>
      <div className="dahe-actions"><button type="button" onClick={event => { clear(controls.current); controls.current.locked = !overview; setPose({ ...player.current }); setOverview(value => !value); event.currentTarget.blur(); }}>{overview ? '繼續探索' : '俯瞰空間'}</button><a href={import.meta.env.BASE_URL}>返回城市 ↗</a></div>
    </div>
    <section className="dahe-journey" aria-label="室內參觀進度">
      <div className="dahe-eyebrow">YOUR LITTLE TOUR <span>{completed} / 5</span></div>
      <h2>{current ? current.title : '把日常的溫暖，帶在身邊。'}</h2>
      <p>{current ? `走到「${current.name}」光圈，停下來看看。` : '五個角落都參觀過了，還可以繼續自由散策。'}</p>
      <ol>{ZONES.map((zone, index) => <li key={zone.id} className={index < completed ? 'is-complete' : index === completed ? 'is-current' : ''}><span>{index < completed ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>{zone.name}</strong><small>{index < completed ? '已留下一段記憶' : index === completed ? '下一個小發現' : '等待你來走走'}</small></div></li>)}</ol>
      <div className="dahe-journey-actions"><button type="button" className="dahe-text-button" disabled={overview} onClick={() => { clear(controls.current); setCameraReset(value => value + 1); }}>重設視角</button><button type="button" className="dahe-text-button" onClick={() => openInteraction('clear')}>重新參觀</button></div>
      <small className="dahe-camera-hint">拖曳／單指轉動 · 滾輪／雙指縮放</small>
    </section>
    <div className="dahe-map" aria-label="示意空間地圖">
      <div className="dahe-eyebrow">SPACE NOTES <span>布局示意</span></div>
      <svg viewBox="-12 -8 24 16" role="img" aria-label="五個參觀點與目前位置">
        <rect x="-11" y="-7" width="22" height="14" rx=".5" fill="#eee9de" stroke="#c8cdbd" strokeWidth=".15" />
        <path d="M-10.5-6.5H-2.5V-4.9H-10.5Z" fill="#d0bf9f" />
        <path d="M4.6-5.9H10V-3.8H4.6Z" fill="#a5a1ab" />
        {TABLE_POSITIONS.map(([x, z], i) => <rect key={i} x={x - 1} y={z - .5} width="2" height="1" rx=".15" fill="#d4c09e" />)}
        {ZONES.map((zone, i) => <g key={zone.id}><circle cx={zone.point[0]} cy={zone.point[1]} r=".63" fill={i === completed ? '#b67b3c' : i < completed ? '#709a87' : '#c9c4ba'} /><text x={zone.point[0]} y={zone.point[1] + .22} textAnchor="middle" fontSize=".7" fill="white">{i + 1}</text></g>)}
        <circle className="dahe-map-player" cx={pose.x} cy={pose.z} r=".37" fill="#2e6256" stroke="#fff" strokeWidth=".16" />
      </svg><small><i /> 你的位置 <span>入口在圖下方</span></small>
    </div>
    <div className="dahe-interaction"><span>{overview ? '換個角度，看看空間的全貌。' : near ? `你來到${zoneAt(near)?.name}。` : '跟著金色光圈，慢慢走就好。'}</span><button ref={interactButton} type="button" disabled={!near || overview} onClick={() => { const id = nearZone(player.current.x, player.current.z); if (id) openInteraction(id); }}>看看這裡 <kbd>E</kbd></button></div>
    <div className="dahe-bottom"><span>WASD／方向鍵 移動奶奶 · Shift 加快 · Space 停下 · R 回到入口</span><span>{center.id === 'daihe' ? '照片靈感 × 虛構配置' : '共用示意空間'} · 獨立預覽</span></div>
    <div className="dahe-pad" aria-label="觸控移動方向">{[['KeyW', '向前', '↑'], ['KeyA', '向左', '←'], ['KeyS', '向後', '↓'], ['KeyD', '向右', '→']].map(([code, label, glyph]) => <button key={code} type="button" className={`dahe-pad-${code}`} aria-label={label} disabled={!!interaction || overview} onPointerDown={press(code)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onContextMenu={event => event.preventDefault()}>{glyph}</button>)}</div>
    {notice && <div className="dahe-notice" role="status">{notice}</div>}
    <dialog ref={dialog} className="dahe-dialog" aria-labelledby="dahe-dialog-title" onCancel={event => { event.preventDefault(); closeDialog(); }}>
      <span className="dahe-eyebrow">{interaction === 'clear' ? 'START A NEW LITTLE TOUR' : 'A MOMENT TO NOTICE'}</span>
      <h2 id="dahe-dialog-title">{interaction === 'clear' ? '重新參觀五個角落？' : shown?.name}</h2>
      <p>{interaction === 'clear' ? '只會重設這個獨立預覽的參觀進度。城市旅程與探索日記會保留。' : shown?.text}</p>
      {interaction !== 'clear' && <small>{center.id === 'daihe' ? '此為照片啟發的遊戲空間；格局、尺寸與情境文案皆為示意。' : '此為共用遊戲空間，並非本館實景；格局、尺寸與情境文案皆為示意。'}</small>}
      <div>{interaction === 'clear' ? <button type="button" disabled={!saved.writable} onClick={() => { setCompleted(0); setReset(value => value + 1); closeDialog(); }}>重新開始參觀</button> : current?.id === interaction ? <button type="button" onClick={complete}>記下這個角落</button> : <span>{ZONES.findIndex(zone => zone.id === interaction) < completed ? '這段記憶已收錄。' : `先去${current?.name ?? '其他角落'}，再回來看看。`}</span>}<button type="button" onClick={closeDialog}>繼續散策</button></div>
    </dialog>
  </div>;
}
