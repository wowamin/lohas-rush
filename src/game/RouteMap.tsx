import { useMemo } from 'react';
import { locations } from '../data/locations';
import { findRoadRoute, nearestRoadNode, nodeById, roads, CITY_LIMIT, cityBlocks, streetDistricts } from '../data/roadNetwork';
import { centerDistrictIds } from '../data/streetGrid';
import { useGame } from '../stores/game';
import { river } from '../data/landscape';

export function RouteMap() {
  const outside=useGame(s=>s.transferPhase==='outside'),busX=useGame(s=>s.parkedBusX),busZ=useGame(s=>s.parkedBusZ);
  const x = useGame(s => s.x), z = useGame(s => s.z), angle = useGame(s => s.angle);
  const mission = useGame(s => s.missionIndex), completed = useGame(s => s.completed);
  const node = nearestRoadNode(x, z);
  const route = useMemo(() => findRoadRoute(node, locations[mission].roadNode).map(p => p.join(',')).join(' '), [node, mission]);
  const extent = CITY_LIMIT + 2;
  const markerScale = extent / 162;
  return <section className="route-map" aria-label="虛構城市路線圖"><span>五區 · 大城市探索</span><svg viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`} role="img" aria-label="中央雙環、五大街區與分散的五中心；金線為道路導航，紅色箭頭為目前位置">
    {streetDistricts.filter(d => centerDistrictIds.includes(d.id)).map(d => <rect key={d.id} x={d.xs[0]} y={d.zs[0]} width={d.xs[d.xs.length - 1] - d.xs[0]} height={d.zs[d.zs.length - 1] - d.zs[0]} fill="#e3e9d7" stroke="#acbfaa" strokeWidth="3" />)}
    <rect x={river.x - river.halfWidth} y={-CITY_LIMIT} width={river.halfWidth * 2} height={CITY_LIMIT * 2} fill="#b3d4dd" />
    {cityBlocks.map(block => <rect key={block.id} x={block.center[0] - block.lotWidth / 2} y={block.center[1] - block.lotDepth / 2} width={block.lotWidth} height={block.lotDepth} fill="#d9dfc7" />)}
    {roads.map(road => { const a = nodeById.get(road.from)!.point, b = nodeById.get(road.to)!.point; return <line key={`${road.from}-${road.to}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#bdcdbf" strokeWidth="6" />; })}
    {!completed && <polyline points={route} fill="none" stroke="#c59945" strokeWidth="4" />}
    {locations.map((location, i) => <g key={location.id}><circle cx={location.position[0]} cy={location.position[2]} r={9 * markerScale} fill={i < mission || completed ? '#769d7a' : i === mission ? '#d8b05e' : '#d4dbcd'} /><text x={location.position[0]} y={location.position[2] + 3 * markerScale} textAnchor="middle" fontSize={9 * markerScale} fill="#284c44">{i + 1}</text></g>)}
    {outside && <g className="parked-bus" transform={`translate(${busX} ${busZ}) scale(${markerScale})`}><title>停駐巴士</title><rect x="-4" y="-6" width="8" height="12" rx="2" fill="#a68b55" stroke="white" strokeWidth="1.5" /></g>}
    <g className="map-vehicle" transform={`translate(${x} ${z}) rotate(${-angle * 180 / Math.PI}) scale(${markerScale})`}><title>{outside ? '目前輪椅位置' : '目前車輛位置'}</title><path d="M0 -7 L5 5 L0 3 L-5 5 Z" transform="scale(1.05)" fill="#e14343" stroke="white" strokeWidth="1.5" /></g>
  </svg><small>遊戲配置・非真實地理位置</small></section>;
}
