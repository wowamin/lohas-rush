import { Html } from '@react-three/drei';
import { useState } from 'react';
import { StreamedAssets } from './assets/StreamedAssets';
import { fountain, locations } from '../data/city';
import { useGame } from '../stores/game';
import { StaticScenery } from './StaticScenery';
import { NavigationRoute } from './NavigationRoute';
import { mountains } from '../data/landscape';
import { ChairpersonNPC } from './characters/ChairpersonNPC';
import { HeadquartersBuilding } from './HeadquartersBuilding';
import { DaiheCenterBuilding } from './DaiheCenterBuilding';
import { AnnanCenterBuilding } from './AnnanCenterBuilding';
import { XinyingCenterBuilding } from './XinyingCenterBuilding';
import { QiguCenterBuilding } from './QiguCenterBuilding';
import { Lighting } from './rendering/Lighting';
import { CenterCampuses } from './CenterCampuses';
import { NearbyWorldLabels } from './NearbyWorldLabels';
export function City() {
  const [hiddenShops, setHiddenShops] = useState<ReadonlySet<string>>(new Set());
  const mission = useGame(s => s.missionIndex);
  const completed = useGame(s => s.completed);
  return <>
    <Lighting />
    <StaticScenery hiddenShops={hiddenShops} />
    <CenterCampuses />
    <HeadquartersBuilding />
    <DaiheCenterBuilding />
    <AnnanCenterBuilding />
    <XinyingCenterBuilding />
    <QiguCenterBuilding id="longshan" />
    <QiguCenterBuilding id="yihe" />
    <ChairpersonNPC />
    <StreamedAssets onShopsChanged={setHiddenShops} />
    <NavigationRoute />
    {mountains.map(m => <mesh key={`${m.x},${m.z}`} position={[m.x, m.height / 2, m.z]} castShadow><coneGeometry args={[m.radius, m.height, 6]} /><meshStandardMaterial color={m.color} flatShading /></mesh>)}
    <group position={[fountain.x, 0, fountain.z]}>
      <mesh receiveShadow position={[0, 0.25, 0]}><cylinderGeometry args={[6, 6, 0.5, 24]} /><meshStandardMaterial color="#e8dfc9" /></mesh>
      <mesh position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[5.3, 24]} /><meshStandardMaterial color="#9fcbd7" /></mesh>
      <mesh position={[0, 1.7, 0]}><cylinderGeometry args={[0.35, 0.6, 2.5, 10]} /><meshStandardMaterial color="#efeadb" /></mesh>
      <mesh position={[0, 3.2, 0]}><coneGeometry args={[1.5, 2, 12]} /><meshStandardMaterial color="#b7e0e5" transparent opacity={0.7} /></mesh>
    </group>
    <NearbyWorldLabels />
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
