import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function VehicleContactShadow({ subtle=false }: { subtle?: boolean }) {
  const {map,wheels}=useMemo(()=>{
    const size=64,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const radius=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),a=Math.max(0,1-radius);
      data.set([255,255,255,Math.round(a*a*255)],(y*size+x)*4);
    }
    const map=new THREE.DataTexture(data,size,size);map.needsUpdate=true;map.magFilter=THREE.LinearFilter;
    const planes=[];
    for(const x of [-1.075,1.075])for(const z of [-1.3,1.3]){
      const plane=new THREE.PlaneGeometry(.85,1.05);plane.rotateX(-Math.PI/2);plane.translate(x,.146,z);planes.push(plane);
    }
    const wheels=mergeGeometries(planes);planes.forEach(p=>p.dispose());return{map,wheels};
  },[]);
  useEffect(()=>()=>{map.dispose();wheels.dispose();},[map,wheels]);
  return <group name="vehicle-contact-shadows">
    <mesh geometry={wheels} renderOrder={1}><meshBasicMaterial map={map} color="#18211c" transparent opacity={subtle?.25:.34} depthWrite={false} polygonOffset polygonOffsetFactor={-1} /></mesh>
    <mesh position={[0,.144,0]} rotation={[-Math.PI/2,0,0]} renderOrder={1}><planeGeometry args={[2.8,4.5]} /><meshBasicMaterial map={map} color="#18211c" transparent opacity={.18} depthWrite={false} /></mesh>
  </group>;
}
