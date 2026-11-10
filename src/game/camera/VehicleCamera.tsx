import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { buildings, fountain } from '../../data/city';
import { mountains } from '../../data/landscape';
import { useGame } from '../../stores/game';
import type { VehicleState } from '../vehicle/drivingPhysics';
import { CameraBrain } from './CameraBrain';
import type { CameraBlocker } from './cameraCollision';
import { WheelchairCameraAvoidance } from './wheelchairCamera';
import { bindMouseOrbit } from './MouseOrbit';
import { useVisual } from '../../stores/visual';

const blockers: CameraBlocker[] = [
  ...buildings.map(b => ({ min: { x: b.x - b.halfX, y: 0, z: b.z - b.halfZ }, max: { x: b.x + b.halfX, y: b.height + 0.65, z: b.z + b.halfZ } })),
  ...mountains.map(m => ({ min: { x: m.x - m.radius, y: 0, z: m.z - m.radius }, max: { x: m.x + m.radius, y: m.height, z: m.z + m.radius } })),
  { min: { x: fountain.x - fountain.radius, y: 0, z: fountain.z - fountain.radius }, max: { x: fountain.x + fountain.radius, y: 0.8, z: fountain.z + fountain.radius } },
];
export function VehicleCamera({ target, parkedBus }: { target: MutableRefObject<VehicleState>; parkedBus: MutableRefObject<VehicleState> }) {
  const camera = useThree(s => s.camera);
  const canvas=useThree(s=>s.gl.domElement);
  const [brain] = useState(() => new CameraBrain());
  const viewMode=useVisual(s=>s.viewMode);
  const [chairCamera]=useState(()=>new WheelchairCameraAvoidance());
  const lastReset = useRef(-1);
  const busBlocker=useRef<CameraBlocker>({min:{x:0,y:0,z:0},max:{x:0,y:2.5,z:0}});
  const [chairBlockers]=useState(()=>[...blockers,busBlocker.current]);
  useEffect(()=>viewMode==='game'?bindMouseOrbit(canvas,brain.orbit,()=>({position:camera.position,target:target.current,aimHeight:brain.aimHeight})):undefined,[canvas,brain,camera,target,viewMode]);
  useFrame((_, delta) => {
    if(useVisual.getState().viewMode!=='game')return;
    const { cameraMode: mode, resetKey, transferPhase } = useGame.getState();
    const liveMode = transferPhase === 'outside' ? 'wheelchair' : transferPhase === 'stowed' ? mode : 'service';
    if (lastReset.current !== resetKey) { brain.reset(target.current, liveMode); chairCamera.reset(); lastReset.current = resetKey; }
    let obstacles=blockers;
    if (transferPhase==='outside') {
      const bus=parkedBus.current, c=Math.abs(Math.cos(bus.angle)), s=Math.abs(Math.sin(bus.angle));
      const hx=c*1.3+s*2.17,hz=s*1.3+c*2.17;
      busBlocker.current.min.x=bus.x-hx; busBlocker.current.min.z=bus.z-hz;
      busBlocker.current.max.x=bus.x+hx; busBlocker.current.max.z=bus.z+hz;
      obstacles=chairBlockers;
    }
    if(transferPhase==='outside' && !brain.orbit.active) brain.update(target.current,delta,liveMode,obstacles,position=>{chairCamera.apply(position,target.current,obstacles,delta,brain.position);});
    else {chairCamera.reset();brain.update(target.current,delta,liveMode,obstacles);}
    camera.position.copy(brain.position); camera.up.set(0, 1, 0); camera.lookAt(brain.lookAt);
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - brain.fov) > 0.000001) {
      camera.fov = brain.fov; camera.updateProjectionMatrix();
    }
  }, -1);
  return null;
}
