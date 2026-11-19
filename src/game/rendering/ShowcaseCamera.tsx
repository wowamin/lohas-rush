import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildings } from '../../data/city';
import { useVisual } from '../../stores/visual';

export function ShowcaseCamera() {
  const { camera,gl,size }=useThree(),mode=useVisual(s=>s.viewMode),id=useVisual(s=>s.building);
  const orbit=useRef<OrbitControls>();
  useEffect(()=>{
    if(mode!=='showcase')return;
    const building=buildings.find(b=>b.id===id)||buildings.find(b=>b.id==='headquarters')!;
    const saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera instanceof PerspectiveCamera?camera.fov:58};
    const height=building.id==='headquarters'?12:building.height,span=Math.max(16,height*1.6);
    const rotation=building.rotation??0,cos=Math.cos(rotation),sin=Math.sin(rotation);
    const fit=Math.max(1,Math.hypot(building.halfX,building.halfZ)*1.15/(Math.tan(Math.PI/8)*(size.width/size.height)*Math.hypot(span,span*1.35)));
    camera.position.set(building.x+(cos*span+sin*span*1.35)*fit, height*.85+4,building.z+(-sin*span+cos*span*1.35)*fit);
    if(camera instanceof PerspectiveCamera){camera.fov=45;camera.updateProjectionMatrix();}
    const controls=new OrbitControls(camera,gl.domElement);
    controls.target.set(building.x,height*.42,building.z);controls.enableDamping=true;controls.dampingFactor=.09;
    controls.minDistance=8;controls.maxDistance=150;controls.maxPolarAngle=Math.PI*.48;controls.screenSpacePanning=false;
    controls.update();orbit.current=controls;
    return ()=>{orbit.current=undefined;controls.dispose();camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);if(camera instanceof PerspectiveCamera){camera.fov=saved.fov;camera.updateProjectionMatrix();}};
  },[camera,gl,mode,id,size.width,size.height]);
  useFrame(()=>orbit.current?.update(),-.5);
  return null;
}
