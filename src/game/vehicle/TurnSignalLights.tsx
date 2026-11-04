import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MeshStandardMaterial } from 'three';

// Vehicle faces -Z: driver's left is -X. Lamps sit just outside the body shell.
export type VehicleLightsState = { turn: 'off' | 'left' | 'right'; braking: boolean };
export function TurnSignalLights({ state }: { state: MutableRefObject<VehicleLightsState> }) {
  const materials = useRef<(MeshStandardMaterial | null)[]>([]);
  const brakeMaterials = useRef<(MeshStandardMaterial | null)[]>([]);
  const activeSignal = useRef<VehicleLightsState['turn']>('off');
  const blinkTime = useRef(0);
  const activeBrakeWarning = useRef(false);
  const brakeBlinkTime = useRef(0);
  useFrame((_, delta) => {
    const { turn, braking } = state.current;
    if (turn !== activeSignal.current) {
      activeSignal.current = turn;
      blinkTime.current = 0;
    } else if (turn !== 'off') blinkTime.current = (blinkTime.current + delta) % .8;
    const signalLit = turn !== 'off' && blinkTime.current < .4;
    if (braking !== activeBrakeWarning.current) {
      activeBrakeWarning.current = braking;
      brakeBlinkTime.current = 0;
    } else if (braking) brakeBlinkTime.current = (brakeBlinkTime.current + delta) % .8;
    const brakeLit = braking && brakeBlinkTime.current < .4;
    materials.current.forEach((material, index) => {
      if (!material) return;
      const on = signalLit && turn === (index < 3 ? 'left' : 'right');
      material.color.set(on ? '#ffb52e' : '#945011');
      material.emissiveIntensity = on ? 3 : 0;
    });
    brakeMaterials.current.forEach(material => {
      if (!material) return;
      material.color.set(brakeLit ? '#ff3028' : '#85252a');
      material.emissiveIntensity = brakeLit ? 2.5 : 0;
    });
  });
  return <group name="turn-signal-lights">{([-1, 1] as const).flatMap((side, sideIndex) => [
    { position: [side * .91, .99, -2.17], size: [.22, .14, .055] },
    { position: [side * .75, 1.23, 2.17], size: [.10, .16, .055] },
    { position: [side * 1.105, 1.32, -.88], size: [.045, .10, .18] },
  ].map(({ position, size }, index) => <mesh key={`${side}-${index}`} name={`signal-${side < 0 ? 'left' : 'right'}-${index}`}
    position={position as [number, number, number]}>
    <boxGeometry args={size as [number, number, number]} />
    <meshStandardMaterial ref={material => { materials.current[sideIndex * 3 + index] = material; }}
      color="#945011" emissive="#ff9800" emissiveIntensity={0} roughness={.3} toneMapped={false} />
  </mesh>))}<group name="brake-lights">{([-1, 1] as const).map((side, index) => <mesh key={side}
    name={`brake-${side < 0 ? 'left' : 'right'}`} position={[side * .92, 1.25, 2.14]}>
    <boxGeometry args={[.13, .40, .055]} />
    <meshStandardMaterial ref={material => { brakeMaterials.current[index] = material; }}
      color="#85252a" emissive="#ff1710" emissiveIntensity={0} roughness={.3} toneMapped={false} />
  </mesh>)}</group></group>;
}
