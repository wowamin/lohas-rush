import { useMemo, useState } from 'react';
import { locations } from '../data/locations';
import { findRoadRoute, nearestRoadNode, nodeById, roads, CITY_LIMIT, cityBlocks, streetDistricts } from '../data/roadNetwork';
import { centerDistrictIds } from '../data/streetGrid';
import { useGame } from '../stores/game';
import { river } from '../data/landscape';
import {useStore} from 'zustand';
import {explorationStore} from '../stores/exploration';
import {explorationLocations} from '../data/explorationLocations';
import {explorationStatus} from '../exploration/types';

export function RouteMap() {
  const [collapsed, setCollapsed] = useState(false);
  const journalEntries=useStore(explorationStore,state=>state.entries);
  const outside=useGame(s=>s.transferPhase==='outside'),busX=useGame(s=>s.parkedBusX),busZ=useGame(s=>s.parkedBusZ);
  const x = useGame(s => s.x), z = useGame(s => s.z);
  const mission = useGame(s => s.missionIndex), completed = useGame(s => s.completed);
  const node = nearestRoadNode(x, z);
  const route = useMemo(() => findRoadRoute(node, locations[mission].roadNode).map(p => p.join(',')).join(' '), [node, mission]);
  const extent = CITY_LIMIT + 2;
  const localExtent = 34;
  const viewExtent = collapsed ? localExtent : extent;
  const mapScale = collapsed ? localExtent / extent : 1;
  const markerScale = extent / 162;
  return <section className={`route-map${collapsed ? ' is-collapsed' : ''}`} aria-label="虛構城市路線圖">
    {!collapsed && <span>五區 · 大城市探索</span>}
    <button type="button" className="route-map-toggle" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? '展開完整 GPS 地圖' : '縮小 GPS 地圖'} title={collapsed ? '展開地圖' : '縮小地圖'}>{collapsed ? '展開' : '縮小'}</button>
    <svg viewBox={`${collapsed ? x - localExtent : -extent} ${collapsed ? z - localExtent : -extent} ${viewExtent * 2} ${viewExtent * 2}`} role="img" aria-label={collapsed ? '目前位置周邊放大導航地圖' : '城市導航地圖；金線為導航路線，紅色圓點為目前位置'}>
    {!collapsed && streetDistricts.filter(d => centerDistrictIds.includes(d.id)).map(d => <rect key={d.id} x={d.xs[0]} y={d.zs[0]} width={d.xs[d.xs.length - 1] - d.xs[0]} height={d.zs[d.zs.length - 1] - d.zs[0]} fill="#e3e9d7" stroke="#acbfaa" strokeWidth="2pt" vectorEffect="non-scaling-stroke" />)}
    {!collapsed && <rect x={river.x - river.halfWidth} y={-CITY_LIMIT} width={river.halfWidth * 2} height={CITY_LIMIT * 2} fill="#b3d4dd" />}
    {!collapsed && cityBlocks.map(block => <rect key={block.id} x={block.center[0] - block.lotWidth / 2} y={block.center[1] - block.lotDepth / 2} width={block.lotWidth} height={block.lotDepth} fill="#d9dfc7" />)}
    {roads.map(road => { const a = nodeById.get(road.from)!.point, b = nodeById.get(road.to)!.point; return <line key={`${road.from}-${road.to}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={collapsed ? '#8fa99e' : '#bdcdbf'} strokeWidth={collapsed ? '5pt' : '2pt'} vectorEffect="non-scaling-stroke" />; })}
    {!completed && <polyline points={route} fill="none" stroke="#c59945" strokeWidth="3pt" vectorEffect="non-scaling-stroke" />}
    <g className="map-exploration-markers">{explorationLocations.map(location=>{
      const status=explorationStatus(journalEntries[location.id]),[px,pz]=location.position;
      const symbol=status==='undiscovered'?'?':status==='completed'?'✓':'◇';
      return <g key={location.id} data-exploration-marker={location.id} data-exploration-status={status} aria-label={status==='undiscovered'?'未發現據點':`${location.name}・${status==='completed'?'探索完成':'已發現'}`}><title>{status==='undiscovered'?'未發現據點':`${location.name}・${status==='completed'?'已完成探索':'已發現'}`}</title><circle cx={px} cy={pz} r={7*markerScale*mapScale} fill={status==='completed'?'#d6e5ce':'#fffdf1'} stroke={status==='discovered'?'#b38237':'#52725f'} strokeWidth="1pt" vectorEffect="non-scaling-stroke"/><text x={px} y={pz+3*markerScale*mapScale} fontSize={10*markerScale*mapScale} fontWeight="700" fill="#315946" textAnchor="middle">{symbol}</text></g>;
    })}</g>
    {locations.map((location, i) => <g key={location.id}><circle cx={location.position[0]} cy={location.position[2]} r={9 * markerScale * mapScale} fill={i < mission || completed ? '#769d7a' : i === mission ? '#d8b05e' : '#d4dbcd'} /><text x={location.position[0]} y={location.position[2] + 3 * markerScale * mapScale} textAnchor="middle" fontSize={9 * markerScale * mapScale} fill="#284c44">{i + 1}</text></g>)}
    {outside && <g className="parked-bus" transform={`translate(${busX} ${busZ}) scale(${markerScale * mapScale})`}><title>停駐巴士</title><rect x="-4" y="-6" width="8" height="12" rx="2" fill="#a68b55" stroke="white" strokeWidth="1.5" /></g>}
    <g className="map-vehicle" transform={`translate(${x} ${z})`}><title>{outside ? '目前輪椅位置' : '目前車輛位置'}</title><circle className="map-vehicle-dot" r="5pt" fill="#e14343" stroke="white" strokeWidth="1pt" vectorEffect="non-scaling-stroke" /></g>
  </svg>{!collapsed && <small>遊戲配置・非真實地理位置</small>}</section>;
}
