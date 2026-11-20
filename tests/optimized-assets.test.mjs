import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import { readFile, stat } from 'node:fs/promises';
import { createSurface } from '../src/game/rendering/materials.ts';

const triangles = document => document.getRoot().listNodes().reduce((sum, node) => sum + (node.getMesh()?.listPrimitives().reduce((n,p) => {
  const positions=p.getAttribute('POSITION'),indices=p.getIndices();let count=0;
  const a=[],b=[],c=[];
  for(let i=0;i<(indices?.getCount()??positions.getCount());i+=3){
    positions.getElement(indices?indices.getScalar(i):i,a);positions.getElement(indices?indices.getScalar(i+1):i+1,b);positions.getElement(indices?indices.getScalar(i+2):i+2,c);
    const u=b.map((x,k)=>x-a[k]),v=c.map((x,k)=>x-a[k]);
    if(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-10)count++;
  }
  return n+count;
}, 0) ?? 0), 0);
test('Draco exports are smaller, decode correctly, retain world bounds/triangles and preserve the van door pivots', async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
  for (const [source, output] of [['public/assets/models/lohas_service_van.glb','public/assets/optimized/lohas_service_van.glb'], ['public/lohas_building_reference.glb','public/assets/optimized/lohas_building_reference.glb']]) {
    const [original, compressed] = await Promise.all([io.read(source), io.read(output)]);
    const a = getBounds(original.getRoot().listScenes()[0]), b = getBounds(compressed.getRoot().listScenes()[0]);
    for (const side of ['min','max']) for (let axis=0;axis<3;axis++) assert(Math.abs(a[side][axis]-b[side][axis])<.002, `${output} ${side}[${axis}]`);
    assert.equal(triangles(original), triangles(compressed));
    assert((await stat(output)).size < (await stat(source)).size*.2);
    if (output.includes('service_van')) {
      for (const name of ['driverDoor','passengerDoor','rearHatch']) {
        const a=original.getRoot().listNodes().find(node=>node.getName()===name),b=compressed.getRoot().listNodes().find(node=>node.getName()===name);
        assert(a&&b, `Preserves animated ${name}`); assert.deepEqual(b.getWorldMatrix(), a.getWorldMatrix());
      }
    }
    const bytes = await readFile(output), json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
    assert(json.extensionsRequired.includes('KHR_draco_mesh_compression'));
  }
});

test('lossless WebP maps reproduce all original color, normal and roughness pixels', async () => {
  for (const surface of ['plaster','concrete','asphalt','tile','grass']) {
    const material=createSurface(surface);
    for (const [slot,map] of [['color',material.map],['normal',material.normalMap],['roughness',material.roughnessMap]]) {
      const file=`public/assets/textures/${surface}-${slot}.webp`,result=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      assert.equal(result.info.width,256); assert.equal(result.info.height,256);
      assert.deepEqual(result.data,Buffer.from(map.image.data)); assert((await stat(file)).size<map.image.data.length);
      map.dispose();
    }
    material.dispose();
  }
});
