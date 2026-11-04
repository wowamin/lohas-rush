import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { PedestrianStreet } from './PedestrianStreet';

function Street({ debug }: { debug: boolean }) {
  const [street, setStreet] = useState<PedestrianStreet | null>(null);
  useEffect(() => {
    const scene = new PedestrianStreet(); setStreet(scene);
    return () => scene.dispose();
  }, []);
  useEffect(() => { if (street) street.debugCollisions.visible=debug; }, [street,debug]);
  return street ? <primitive object={street} dispose={null} /> : null;
}

export default function PedestrianStreetPreview() {
  const [debug, setDebug] = useState(false);
  return <main>
    <Canvas shadows dpr={[1,1.5]} camera={{ position:[32,36,42], fov:45, near:.1, far:200 }}>
      <color attach="background" args={['#dfe9e8']} />
      <hemisphereLight args={['#fff9ed','#718371',1.8]} />
      <directionalLight position={[15,35,12]} intensity={2.2} castShadow shadow-mapSize={[1024,1024]}
        shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45}
        shadow-camera-far={100} shadow-normalBias={.03} />
      <Street debug={debug} />
      <OrbitControls target={[0,0,0]} minDistance={8} maxDistance={100} maxPolarAngle={Math.PI*.48} />
    </Canvas>
    <aside style={{position:'absolute',top:16,left:16,maxWidth:'min(320px, calc(100% - 32px))',padding:16,borderRadius:12,background:'#fffdf1ee'}}>
      <strong>Pedestrian street study</strong>
      <p style={{fontSize:12,lineHeight:1.6}}>3 m lanes · 2.4 m clear sidewalks<br/>0.15 m raised crossings · 4.5 m setback<br/>1.8 m refuge · 1:12 approach ramps</p>
      <button type="button" aria-pressed={debug} onClick={()=>setDebug(value=>!value)}>Collision boundaries: {debug?'on':'off'}</button>
      <p style={{fontSize:11}}>Drag to orbit · Scroll to zoom</p>
      <a href={import.meta.env.BASE_URL}>Return to game</a>
    </aside>
  </main>;
}
