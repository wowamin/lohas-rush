import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Group } from 'three';
import { chairperson } from '../../data/city';
import { useGame } from '../../stores/game';
import { disposeModels } from '../assets/GameAssets';
import { createChairpersonModel } from './chairpersonModel';

export function ChairpersonNPC() {
  const container = useRef<Group>(null);
  const character = useRef<ReturnType<typeof createChairpersonModel>>();
  const nearby = useGame(s => Math.hypot(s.x - chairperson.x, s.z - chairperson.z) < 18);
  useEffect(() => {
    const host = container.current!, model = createChairpersonModel();
    character.current = model; host.add(model.root);
    return () => { host.remove(model.root); disposeModels([model.root]); character.current = undefined; };
  }, []);
  useFrame(({ clock }) => {
    if (!character.current) return;
    character.current.greeting.rotation.z = Math.sin(clock.elapsedTime * 1.8) * .045;
    character.current.root.scale.y = 1 + Math.sin(clock.elapsedTime * 2) * .003;
  });
  return <group name="headquarters-chairperson" position={[chairperson.x, chairperson.y, chairperson.z]}>
    <group ref={container} />
    {nearby && <Html position={[0, 2.12, 0]} center distanceFactor={9} occlude zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
      <div className="world-label">集團董事長（老闆）<small>歡迎來到樂活總部！</small></div>
    </Html>}
  </group>;
}
