import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { HalfFloatType, Vector2, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Pass } from 'three/addons/postprocessing/Pass.js';
import { QUALITY } from './quality';
import { useVisual } from '../../stores/visual';
import { telemetry } from './Lighting';

export function RenderEffects() {
  const { gl,scene,camera,size,viewport }=useThree();
  const quality=useVisual(s=>s.quality),ao=useVisual(s=>s.ao),bloom=useVisual(s=>s.bloom);
  const pipeline=useRef<{composer:EffectComposer;ao?:SSAOPass}>();
  const capture=useRef(useVisual.getState().captureRequest),timing=useRef({elapsed:0,frames:0});
  useEffect(()=>{
    const wasAuto=gl.info.autoReset,shadowAuto=gl.shadowMap.autoUpdate;
    const originalRender=gl.render,originalShadow=gl.shadowMap.render;
    gl.info.autoReset=false;gl.shadowMap.autoUpdate=false;
    gl.shadowMap.render=(...args:Parameters<typeof originalShadow>)=>{
      const before=gl.info.render.calls;originalShadow.apply(gl.shadowMap,args);telemetry().shadowCalls+=gl.info.render.calls-before;
    };
    gl.render=(...args:Parameters<typeof originalRender>)=>{
      const before=gl.info.render.calls,shadowBefore=telemetry().shadowCalls;
      originalRender.apply(gl,args);
      if(args[0]===scene&&!scene.overrideMaterial)telemetry().beautyCalls=gl.info.render.calls-before-(telemetry().shadowCalls-shadowBefore);
    };
    return ()=>{gl.render=originalRender;gl.shadowMap.render=originalShadow;gl.info.autoReset=wasAuto;gl.shadowMap.autoUpdate=shadowAuto;};
  },[gl,scene]);
  useEffect(()=>{
    if(quality==='low'||!ao&&!bloom)return;
    const profile=QUALITY[quality],ratio=gl.getPixelRatio();
    const target=new WebGLRenderTarget(1,1,{type:HalfFloatType,samples:quality==='high'?4:2});
    const composer=new EffectComposer(gl,target),passes:Pass[]=[];
    composer.setPixelRatio(ratio);composer.setSize(size.width,size.height);
    const beauty=new RenderPass(scene,camera);composer.addPass(beauty);passes.push(beauty);
    let occlusion:SSAOPass|undefined;
    if(ao){
      occlusion=new SSAOPass(scene,camera,Math.ceil(size.width*ratio*profile.aoScale),Math.ceil(size.height*ratio*profile.aoScale),profile.aoSamples);
      occlusion.kernelRadius=quality==='high'?.7:.5;occlusion.minDistance=.001;occlusion.maxDistance=.04;
      composer.addPass(occlusion);passes.push(occlusion);
      // Composer.addPass resizes to full output: restore the intended reduced AO resolution.
      occlusion.setSize(Math.ceil(size.width*ratio*profile.aoScale),Math.ceil(size.height*ratio*profile.aoScale));
    }
    if(bloom&&quality==='high'){const glow=new UnrealBloomPass(new Vector2(size.width,size.height),.1,.25,1.4);composer.addPass(glow);passes.push(glow);}
    const output=new OutputPass();composer.addPass(output);passes.push(output);
    pipeline.current={composer,ao:occlusion};
    return ()=>{pipeline.current=undefined;for(const pass of passes)pass.dispose();composer.dispose();};
  },[gl,scene,camera,size.width,size.height,viewport.dpr,quality,ao,bloom]);
  useFrame((_,delta)=>{
    gl.info.reset();
    telemetry().shadowCalls=0;gl.shadowMap.needsUpdate=true;
    const active=pipeline.current;
    if(active?.ao){
      const uniforms=active.ao.ssaoMaterial.uniforms;
      uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
    }
    if(active)active.composer.render(delta);else gl.render(scene,camera);
    const info=telemetry();info.calls=gl.info.render.calls;info.triangles=gl.info.render.triangles;
    info.geometries=gl.info.memory.geometries;info.textures=gl.info.memory.textures;
    timing.current.elapsed+=delta;timing.current.frames++;
    if(timing.current.elapsed>=.75){info.fps=timing.current.frames/timing.current.elapsed;timing.current={elapsed:0,frames:0};}
    const visual=useVisual.getState();
    if(capture.current!==visual.captureRequest){
      capture.current=visual.captureRequest;
      try {const link=document.createElement('a');link.download='lohas-rush-showcase.png';link.href=gl.domElement.toDataURL('image/png');link.click();visual.setCaptureStatus('已擷取 PNG');}
      catch{visual.setCaptureStatus('擷取失敗，請重試');}
    }
  },1);
  return null;
}
