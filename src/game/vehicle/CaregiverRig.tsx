import {useEffect,useRef,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group} from 'three';
import type {PassengerTransfer} from './passengerTransfer';
import type {VehicleState} from './drivingPhysics';
import {wheelchairLocal} from './wheelchairController';
import {caregiverPose,CAREGIVER_OFFSET} from './caregiverPose';
import {createCaregiverModel,poseCaregiver,type CaregiverModel} from './caregiverModel';
import {disposeModels} from '../assets/GameAssets';
import {useGame} from '../../stores/game';

export function CaregiverRig({transfer,wheelchair,bus}:{transfer:MutableRefObject<PassengerTransfer>;wheelchair:MutableRefObject<VehicleState>;bus:MutableRefObject<VehicleState>}){
  const root=useRef<Group>(null),model=useRef<CaregiverModel>(),stride=useRef(0);
  const lastReset=useRef(useGame.getState().resetKey);
  const previousChair=useRef({x:wheelchair.current.x,z:wheelchair.current.z,angle:wheelchair.current.angle});
  const previousPhase=useRef(transfer.current.phase);
  useEffect(()=>{
    const container=root.current!,character=createCaregiverModel();model.current=character;container.add(character.root);
    return()=>{container.remove(character.root);disposeModels([character.root]);model.current=undefined;};
  },[]);
  useFrame((_,delta)=>{
    const element=root.current;if(!element)return;
    if(lastReset.current!==useGame.getState().resetKey){lastReset.current=useGame.getState().resetKey;stride.current=0;Object.assign(previousChair.current,wheelchair.current);}
    const current=transfer.current,renderBus=bus.current;
    if(current.phase==='outside' && previousPhase.current!=='outside')Object.assign(previousChair.current,wheelchair.current);
    const chair=current.phase==='outside'?wheelchairLocal(wheelchair.current,renderBus):{x:current.pose.grandmaX,z:current.pose.grandmaZ,yaw:current.pose.grandmaYaw};
    const pose=caregiverPose(current.phase,current.progress,chair);
    let motion=pose.walking;
    if(current.phase==='outside'){
      const distance=Math.hypot(wheelchair.current.x-previousChair.current.x,wheelchair.current.z-previousChair.current.z);
      const turn=Math.abs(wheelchair.current.angle-previousChair.current.angle);
      const travel=distance+turn*CAREGIVER_OFFSET;motion=Math.min(1,travel/Math.max(.001,delta)/1.2);stride.current+=travel*10;
    }else stride.current+=Math.min(delta,.1)*8*motion;
    Object.assign(previousChair.current,wheelchair.current);
    previousPhase.current=current.phase;
    element.visible=true;element.position.set(pose.x,pose.y,pose.z);element.rotation.y=pose.yaw;
    element.userData.onboard=pose.seated>.99;
    element.userData.pushing=pose.grip>.99;element.userData.grip=pose.grip;element.userData.walking=motion;
    if(model.current)poseCaregiver(model.current,stride.current,motion,pose.grip,pose.seated);
  },-1.4);
  return <group ref={root} name="caregiver-helper" position={[.55,.75,-1.10]} rotation={[0,Math.PI,0]} />;
}
