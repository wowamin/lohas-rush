import { useEffect,useRef,type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { PassengerTransfer } from './passengerTransfer';
import { createDriverModel,poseDriver,type DriverModel } from './driverModel';
import { driverPose } from './driverAssistance';
import { disposeModels } from '../assets/GameAssets';
import { useGame } from '../../stores/game';

export function DriverRig({transfer}:{transfer:MutableRefObject<PassengerTransfer>}){
  const root=useRef<Group>(null), model=useRef<DriverModel>(),clock=useRef(0);
  const phase=useGame(s=>s.transferPhase);
  const panelVisible=!['stowed','driverExit','driverWalk','driverReturn','driverEnter'].includes(phase);
  useEffect(()=>{
    const container=root.current!,character=createDriverModel();model.current=character;container.add(character.root);
    return()=>{container.remove(character.root);disposeModels([character.root]);model.current=undefined;};
  },[]);
  useFrame((_,delta)=>{
    clock.current+=Math.min(delta,.1);
    const transferState=transfer.current,pose=driverPose(transferState.phase,transferState.progress);
    if(root.current){root.current.position.set(pose.x,pose.y,pose.z);root.current.rotation.y=pose.yaw;root.current.userData.operating=pose.operate>0;root.current.userData.onboard=transferState.phase==='stowed';}
    if(model.current)poseDriver(model.current,pose,clock.current);
  },-1.5);
  return <group name="driver-assistance-rig">
    <group ref={root} name="driver-helper" />
    <group name="lift-control-panel" visible={panelVisible}>
      <mesh position={[-1.0,.60,2.36]}><cylinderGeometry args={[.027,.027,.9,8]} /><meshStandardMaterial color="#546976" /></mesh>
      <mesh position={[-1,.98,2.36]} castShadow><boxGeometry args={[.065,.20,.24]} /><meshStandardMaterial color="#34466f" /></mesh>
      <mesh position={[-1.038,1.02,2.36]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.023,.023,.015,8]} /><meshStandardMaterial color="#89bd73" emissive="#476e3b" emissiveIntensity={.4} /></mesh>
      <mesh position={[-1.038,.94,2.36]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.019,.019,.015,8]} /><meshStandardMaterial color="#d47d6d" /></mesh>
    </group>
  </group>;
}
