import { Html } from '@react-three/drei';
import { buildings, locations, roadCoordinates } from '../data/city';
import { useGame } from '../stores/game';

function Block({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>;
}
export function City() {
  const mission = useGame(s => s.missionIndex);
  const completed = useGame(s => s.completed);
  return <>
    <color attach="background" args={['#dce9e3']} /><fog attach="fog" args={['#dce9e3', 65, 160]} />
    <hemisphereLight args={['#fff9ea', '#8baf91', 2]} />
    <directionalLight position={[-30, 50, 25]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-65} shadow-camera-right={65} shadow-camera-top={65} shadow-camera-bottom={-65} shadow-camera-far={140} shadow-normalBias={0.08} />
    <Block position={[0, -0.2, 0]} size={[160, 0.3, 160]} color="#b6cda4" />
    <Block position={[0, -0.04, 0]} size={[106, 0.15, 106]} color="#d6d6c6" />
    {roadCoordinates.map(p => <group key={p}>
      <Block position={[p, 0.05, 0]} size={[10, 0.08, 105]} color="#7f9292" />
      <Block position={[0, 0.055, p]} size={[105, 0.08, 10]} color="#7f9292" />
      {Array.from({ length: 17 }, (_, i) => -48 + i * 6).filter(n => !roadCoordinates.some(r => Math.abs(r - n) < 5)).map(n => <group key={n}>
        <Block position={[p, 0.105, n]} size={[0.15, 0.015, 2.4]} color="#e8e8cf" />
        <Block position={[n, 0.11, p]} size={[2.4, 0.015, 0.15]} color="#e8e8cf" />
      </group>)}
    </group>)}
    {buildings.map((b, index) => <group key={`${b.x},${b.z}`} position={[b.x, 0, b.z]}>
      <Block position={[0, 0.16, 0]} size={[14, 0.3, 14]} color="#e4dfcf" />
      <Block position={[0, b.height / 2 + 0.3, 0]} size={[12, b.height, 12]} color={b.location?.color ?? b.color} />
      <Block position={[0, b.height + 0.45, 0]} size={[12.5, 0.35, 12.5]} color="#fcf4e2" />
      {[-3.5, 0, 3.5].map(x => <group key={x}>
        <Block position={[x, 3, 6.03]} size={[1.6, 1.8, 0.08]} color="#75989a" />
        <Block position={[6.03, 3, x]} size={[0.08, 1.8, 1.6]} color="#75989a" />
      </group>)}
      {b.location && <Html position={[0, b.height + 2, 0]} center distanceFactor={45} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}><div className="world-label">{b.location.name}</div></Html>}
      <group position={[-8, 0, index % 2 ? 7 : -7]}>
        <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.25, 0.35, 2, 6]} /><meshStandardMaterial color="#a08b6e" /></mesh>
        <mesh position={[0, 3.3, 0]} castShadow><icosahedronGeometry args={[1.8, 0]} /><meshStandardMaterial color={index % 2 ? '#86b195' : '#a4bd88'} /></mesh>
      </group>
      <group position={[8, 0, -7]}>
        <Block position={[0, 2.7, 0]} size={[0.16, 5.4, 0.16]} color="#667b76" />
        <Block position={[-0.5, 5.4, 0]} size={[1.2, 0.15, 0.2]} color="#667b76" />
        <Block position={[-0.9, 5.25, 0]} size={[0.6, 0.2, 0.5]} color="#fff1bc" />
      </group>
    </group>)}
    {locations.map((l, i) => <group key={l.id} position={[l.arrival[0], 0.14, l.arrival[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[l.radius - 0.25, l.radius, 40]} /><meshBasicMaterial color={i < mission || completed ? '#c1d8b0' : i === mission ? '#ffdb83' : '#c8dcdb'} /></mesh>
      {i === mission && !completed && <>
        <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.7, 0.7, 5, 16, 1, true]} /><meshBasicMaterial color="#ffe4a3" transparent opacity={0.24} depthWrite={false} /></mesh>
        <mesh position={[0, 6, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.8, 1.4, 4]} /><meshStandardMaterial color="#ffd278" emissive="#b27c26" emissiveIntensity={0.3} /></mesh>
        <Html position={[0, 8, 0]} center distanceFactor={35} zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}><div className="target-label">{i + 1} · 抵達區</div></Html>
      </>}
    </group>)}
  </>;
}
