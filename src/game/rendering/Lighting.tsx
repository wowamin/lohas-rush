import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { useVisual } from '../../stores/visual';
import { useGame } from '../../stores/game';
import { buildings } from '../../data/city';
import { QUALITY } from './quality';

export type RenderTelemetry = { environment: 'loading' | 'ready' | 'fallback'; fps: number; calls: number; beautyCalls: number; shadowCalls: number; triangles: number; geometries: number; textures: number; quality: string };
declare global { interface Window { __LOHAS_RENDERING__?: RenderTelemetry } }
export function telemetry() {
  return window.__LOHAS_RENDERING__ ??= { environment: 'loading', fps: 0, calls: 0, beautyCalls: 0, shadowCalls: 0, triangles: 0, geometries: 0, textures: 0, quality: 'medium' };
}

export function Lighting() {
  const { gl, scene } = useThree();
  const quality = useVisual(s => s.quality), profile = QUALITY[quality];
  const sun = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    THREE.ColorManagement.enabled = true;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = .94;
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const light=sun.current;
    if(light){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.needsUpdate=true;}
    gl.shadowMap.needsUpdate=true;
    scene.environmentIntensity=quality==='low'?.4:.55;
    telemetry().quality=quality;
  }, [gl,scene,quality]);
  useEffect(() => {
    let active=true,source:THREE.DataTexture|undefined,filtered:THREE.WebGLRenderTarget|undefined;
    const generator=new THREE.PMREMGenerator(gl);
    telemetry().environment='loading';
    void new RGBELoader().loadAsync(`${import.meta.env.BASE_URL}assets/environments/lohas-afternoon.hdr`).then(hdr=>{
      if(!active){hdr.dispose();return;}
      source=hdr;hdr.mapping=THREE.EquirectangularReflectionMapping;
      filtered=generator.fromEquirectangular(hdr);
      scene.environment=filtered.texture;scene.background=hdr;scene.backgroundIntensity=.85;
      telemetry().environment='ready';generator.dispose();
    }).catch(()=>{if(active)telemetry().environment='fallback';generator.dispose();});
    return ()=>{active=false;if(scene.environment===filtered?.texture)scene.environment=null;if(scene.background===source)scene.background=new THREE.Color('#c9dce9');source?.dispose();filtered?.dispose();generator.dispose();};
  },[gl,scene]);
  useFrame(()=>{
    const light=sun.current;if(!light)return;
    const visual=useVisual.getState(),game=useGame.getState();
    const target=visual.viewMode==='showcase'?buildings.find(b=>b.id===visual.building):undefined;
    const step=profile.shadowExtent*2/profile.shadowSize;
    const x=Math.round((target?.x??game.x)/step)*step,z=Math.round((target?.z??game.z)/step)*step;
    light.position.set(x-38,64,z+30);light.target.position.set(x,0,z);light.target.updateMatrixWorld();
  },-.4);
  return <>
    <color attach="background" args={['#c9dce9']} />
    <fog attach="fog" args={['#c9dce9',180,620]} />
    <hemisphereLight args={['#e2efff','#857d65',.65]} />
    <directionalLight ref={sun} color="#fff2dc" intensity={2.8} castShadow
      shadow-mapSize={[profile.shadowSize,profile.shadowSize]} shadow-camera-left={-profile.shadowExtent}
      shadow-camera-right={profile.shadowExtent} shadow-camera-top={profile.shadowExtent} shadow-camera-bottom={-profile.shadowExtent}
      shadow-camera-near={1} shadow-camera-far={180} shadow-bias={quality==='low'?-.0003:-.00012} shadow-normalBias={quality==='low'?.12:quality==='medium'?.055:.035} />
  </>;
}
