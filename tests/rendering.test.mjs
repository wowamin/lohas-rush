import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { SRGBColorSpace, NoColorSpace } from 'three';
import { QUALITY } from '../src/game/rendering/quality.ts';
import { createSurface } from '../src/game/rendering/materials.ts';

test('quality budgets increase without architectural geometry or physics settings',()=>{
  for(const key of ['shadowSize','vegetationRange','detailedTrees'])assert(QUALITY.low[key]<QUALITY.medium[key]&&QUALITY.medium[key]<QUALITY.high[key]);
  assert.equal(QUALITY.low.ao,false);assert.equal(QUALITY.medium.ao,true);
  assert(QUALITY.high.dpr<=1.5);assert(QUALITY.high.shadowSize<=2048);
});
test('actual self-hosted HDR is decodable high dynamic range, not an LDR placeholder',async()=>{
  const bytes=await readFile(new URL('../public/assets/environments/lohas-afternoon.hdr',import.meta.url));
  const result=new RGBELoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  assert.equal(result.width,512);assert.equal(result.height,256);assert(result.data.length===512*256*4);
  // Half-float values above 0x3c00 represent radiance greater than 1.
  assert(result.data.some((value,i)=>i%4!==3&&value>0x3c00));
});
test('PBR factories keep color and numeric maps in their proper color spaces and own resources',()=>{
  const wall=createSurface('plaster'),road=createSurface('asphalt'),tiles=createSurface('tile'),glass=createSurface('glass');
  assert(wall.roughness>=.75&&wall.roughness<=.9);assert.equal(wall.metalness,0);
  for(const material of [wall,road,tiles]){
    assert.equal(material.map.colorSpace,SRGBColorSpace);assert.equal(material.normalMap.colorSpace,NoColorSpace);
    assert.equal(material.roughnessMap.colorSpace,NoColorSpace);
    assert.equal(material.map.image.width,256);
    material.map.dispose();material.normalMap.dispose();material.roughnessMap.dispose();material.dispose();
  }
  assert(glass.isMeshPhysicalMaterial);assert.equal(glass.transmission,0);assert.equal(glass.transparent,false);glass.dispose();
});
