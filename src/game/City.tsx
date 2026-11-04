import { Html } from '@react-three/drei';
import { useState } from 'react';
import { StreamedAssets } from './assets/StreamedAssets';
import { buildings, fountain, locations } from '../data/city';
import { useGame } from '../stores/game';
import { StaticScenery } from './StaticScenery';
import { NavigationRoute } from './NavigationRoute';
import { mountains } from '../data/landscape';
import { ChairpersonNPC } from './characters/ChairpersonNPC';
import { HeadquartersBanner } from './HeadquartersBanner';
import { HeadquartersBuilding } from './HeadquartersBuilding';
import { BirthdayCake } from './BirthdayCake';
export function City() {
  const [hiddenShops, setHiddenShops] = useState<ReadonlySet<string>>(new Set());
  const mission = useGame(s => s.missionIndex);
  const completed = useGame(s => s.completed);
  const nearbyShop = useGame(s => buildings.find(b => b.shop && Math.hypot(s.x - b.x, s.z - b.z) < 23));
  return <>
    <color attach="background" args={['#dce9e3']} /><fog attach="fog" args={['#dce9e3', 100, 250]} />
    <hemisphereLight args={['#fff9ea', '#8baf91', 2]} />
    <directionalLight position={[-30, 70, 25]} intensity={2.5} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-130} shadow-camera-right={130} shadow-camera-top={130} shadow-camera-bottom={-130} shadow-camera-far={300} shadow-normalBias={0.08} />
    <StaticScenery hiddenShops={hiddenShops} />
    <HeadquartersBuilding />
    <BirthdayCake />
    <ChairpersonNPC />
    <HeadquartersBanner />
    <StreamedAssets onShopsChanged={setHiddenShops} />
    <NavigationRoute />
    {mountains.map(m => <mesh key={`${m.x},${m.z}`} position={[m.x, m.height / 2, m.z]} castShadow><coneGeometry args={[m.radius, m.height, 6]} /><meshStandardMaterial color={m.color} flatShading /></mesh>)}
    <group position={[fountain.x, 0, fountain.z]}>
      <mesh receiveShadow position={[0, 0.25, 0]}><cylinderGeometry args={[6, 6, 0.5, 24]} /><meshStandardMaterial color="#e8dfc9" /></mesh>
      <mesh position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[5.3, 24]} /><meshStandardMaterial color="#9fcbd7" /></mesh>
      <mesh position={[0, 1.7, 0]}><cylinderGeometry args={[0.35, 0.6, 2.5, 10]} /><meshStandardMaterial color="#efeadb" /></mesh>
      <mesh position={[0, 3.2, 0]}><coneGeometry args={[1.5, 2, 12]} /><meshStandardMaterial color="#b7e0e5" transparent opacity={0.7} /></mesh>
    </group>
    {buildings.filter(b => !b.residential && !b.shop).map(b => <Html key={b.id} position={[b.x, b.height + 2, b.z]} center distanceFactor={45} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}><div className="world-label">{b.name}<small>幾何佔位・遊戲示意</small></div></Html>)}
    {nearbyShop && <Html position={[nearbyShop.x, nearbyShop.height + 2, nearbyShop.z]} center distanceFactor={35} zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}><div className="world-label">{nearbyShop.name}<small>虛構店家・遊戲示意</small></div></Html>}
    <Html position={[43, 4, 28]} center distanceFactor={30} zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}><div className="world-label">餐車配送・遊戲示意<small>真實供應範圍及餐食未核實</small></div></Html>
    {locations.map((l, i) => <group key={l.id} position={[l.arrival[0], 0.14, l.arrival[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[l.radius - 0.25, l.radius, 40]} /><meshBasicMaterial color={i < mission || completed ? '#c1d8b0' : i === mission ? '#ffdb83' : '#c8dcdb'} /></mesh>
      {i === mission && !completed && <>
        <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.7, 0.7, 5, 16, 1, true]} /><meshBasicMaterial color="#ffe4a3" transparent opacity={0.24} depthWrite={false} /></mesh>
        <mesh position={[0, 6, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.8, 1.4, 4]} /><meshStandardMaterial color="#ffd278" emissive="#b27c26" emissiveIntensity={0.3} /></mesh>
        <Html position={[0, 8, 0]} center distanceFactor={35} zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}><div className="target-label">{i + 1} · 抵達區 · {l.shortName}</div></Html>
      </>}
    </group>)}
  </>;
}
