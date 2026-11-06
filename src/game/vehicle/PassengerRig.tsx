import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { createPassengerModel } from './passengerModels';
import type { PassengerTransfer } from './passengerTransfer';
import { disposeModels } from '../assets/GameAssets';
import type { VehicleState } from './drivingPhysics';
import { wheelchairLocal } from './wheelchairController';
import { useGame } from '../../stores/game';

export function PassengerRig({ transfer, wheelchair, bus }: { transfer: MutableRefObject<PassengerTransfer>; wheelchair: MutableRefObject<VehicleState>; bus: MutableRefObject<VehicleState> }) {
  const phase=useGame(s=>s.transferPhase),outside=phase==='outside';
  const grandma = useRef<Group>(null), grandpa = useRef<Group>(null), deck = useRef<Group>(null);
  const pistons = useRef<Group>(null);
  useEffect(() => {
    const a = grandma.current!, b = grandpa.current!;
    const first = createPassengerModel('grandma'), second = createPassengerModel('grandpa');
    a.add(first); b.add(second);
    return () => { a.remove(first); b.remove(second); disposeModels([first,second]); };
  }, []);
  useFrame(() => {
    const pose = transfer.current.pose;
    if (grandma.current) {
      const local=transfer.current.phase==='outside' ? wheelchairLocal(wheelchair.current,bus.current) : undefined;
      grandma.current.position.set(local?.x ?? pose.grandmaX,local ? .14 : pose.grandmaY,local?.z ?? pose.grandmaZ);
      grandma.current.rotation.y = local?.yaw ?? pose.grandmaYaw;
      grandma.current.userData.onboard = pose.grandmaInside;
    }
    if (deck.current) {
      deck.current.position.y=pose.deckY;deck.current.rotation.x=-pose.fold*Math.PI/2;
      // Retract the extra standing space when folded so the platform still
      // fits below the rear roof. Fully deploy before either person steps on.
      deck.current.scale.z=1-pose.fold/6;
    }
    if (pistons.current) { pistons.current.position.y = (.95+pose.deckY)/2; pistons.current.scale.y = .95-pose.deckY; }
  }, -1.5);
  return <group name="passenger-transfer-rig">
    {outside && <mesh name="wheelchair-boarding-marker" position={[0,.15,4.5]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.60,.68,32]} /><meshBasicMaterial color="#f3cf6f" /></mesh>}
    <group ref={grandma} name="grandma-passenger" position={[-.43,.75,.42]} scale={.9} rotation={[0,Math.PI,0]} />
    <group ref={grandpa} name="grandpa-passenger" position={[.43,.75,.3]} scale={.9} rotation={[0,Math.PI,0]} userData={{ onboard:true }} />
    <group name="lift-supports">
      {[-1,1].map(side => <group key={side}>
        <mesh position={[side*.78,1.2,1.93]} castShadow><boxGeometry args={[.10,1,.10]} /><meshStandardMaterial color="#39484d" /></mesh>
        <mesh position={[side*.78,.75,2.08]}><boxGeometry args={[.14,.13,.30]} /><meshStandardMaterial color="#e5c44f" /></mesh>
      </group>)}
    </group>
    <group ref={pistons} name="lift-pistons">
      {[-1,1].map(side => <mesh key={side} position={[side*.78,0,2.04]}><cylinderGeometry args={[.035,.035,1,8]} /><meshStandardMaterial color="#b7c4c8" metalness={.5} roughness={.4} /></mesh>)}
    </group>
    <group ref={deck} name="wheelchair-lift" position={[0,.75,2]} rotation={[-Math.PI/2,0,0]} scale={[1,1,5/6]}>
      <mesh position={[0,-.035,.9]} castShadow receiveShadow><boxGeometry args={[1.5,.07,1.8]} /><meshStandardMaterial color="#65767c" /></mesh>
      {[-1,1].map(side => <mesh key={side} position={[side*.71,.045,.9]}><boxGeometry args={[.055,.09,1.8]} /><meshStandardMaterial color="#dfc452" /></mesh>)}
      <mesh position={[0,.005,1.76]}><boxGeometry args={[1.5,.04,.08]} /><meshStandardMaterial color="#e9cb56" /></mesh>
      {[.25,.5,.75,1,1.25].map(z => <mesh key={z} position={[0,.003,z]}><boxGeometry args={[1.35,.01,.015]} /><meshStandardMaterial color="#a3b2b6" /></mesh>)}
    </group>
    <group name="driver-rear-steps" visible={['driverClimb','driverGrip','rollingOut','driverSecure','driverStepDown','driverBoard','driverGripIn','rollingIn','driverRelease','driverLeave'].includes(phase)}>
      <mesh position={[-1.18,.30,3.31]} castShadow receiveShadow><boxGeometry args={[.40,.08,.52]} /><meshStandardMaterial color="#65767c" /></mesh>
      <mesh position={[-.94,.50,3.31]} castShadow receiveShadow><boxGeometry args={[.38,.08,.52]} /><meshStandardMaterial color="#65767c" /></mesh>
      {[-1.18,-.94].map((x,i)=><mesh key={x} position={[x,.35+i*.20,3.55]}><boxGeometry args={[.38,.02,.035]} /><meshStandardMaterial color="#e9cb56" /></mesh>)}
    </group>
  </group>;
}
