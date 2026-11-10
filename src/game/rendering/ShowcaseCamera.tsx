import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildings } from '../../data/city';
import { useVisual } from '../../stores/visual';

export function ShowcaseCamera() {
  const { camera,gl }=useThree(),mode=useVisual(s=>s.viewMode),id=useVisual(s=>s.building);
  const orbit=useRef<OrbitControls>();
  useEffect(()=>{
    if(mode!=='showcase')return;
    const building=buildings.find(b=>b.id===id)||buildings.find(b=>b.id==='headquarters')!;
    const saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera instanceof PerspectiveCamera?camera.fov:58};
    const height=building.id==='headquarters'?12:building.height,span=Math.max(16,height*1.6);
    camera.position.set(building.x+span, height*.85+4,building.z+span*1.35);
    if(camera instanceof PerspectiveCamera){camera.fov=45;camera.updateProjectionMatrix();}
    const controls=new OrbitControls(camera,gl.domElement);
    controls.target.set(building.x,height*.42,building.z);controls.enableDamping=true;controls.dampingFactor=.09;
    controls.minDistance=8;controls.maxDistance=150;controls.maxPolarAngle=Math.PI*.48;controls.screenSpacePanning=false;
    controls.update();orbit.current=controls;
    return ()=>{orbit.current=undefined;controls.dispose();camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);if(camera instanceof PerspectiveCamera){camera.fov=saved.fov;camera.updateProjectionMatrix();}};
  },[camera,gl,mode,id]);
  useFrame(()=>orbit.current?.update(),-.5);
  return null;
}
