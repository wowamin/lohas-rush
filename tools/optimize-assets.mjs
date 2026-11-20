import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, draco, flatten, join, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import { mkdir, copyFile, readFile, writeFile, stat } from 'node:fs/promises';
import { createSurface } from '../src/game/rendering/materials.ts';

await mkdir('public/assets/optimized', { recursive: true });
await mkdir('public/assets/textures', { recursive: true });
await mkdir('public/assets/draco', { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule(),
});
const report = { models: [], textures: [], decoderBytes: 0 };
for (const [input, name] of [['public/assets/models/lohas_service_van.glb', 'lohas_service_van.glb'], ['public/lohas_building_reference.glb', 'lohas_building_reference.glb']]) {
  const document = await io.read(input);
  await document.transform(dedup(), prune());
  // The static building can be batched; the van keeps all named doors and pivots.
  if (name === 'lohas_building_reference.glb') await document.transform(flatten(), join());
  await document.transform(weld(), draco({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }));
  const output = `public/assets/optimized/${name}`;
  await io.write(output, document);
  const before = (await stat(input)).size, after = (await stat(output)).size;
  if (after >= before) throw new Error(`Compression did not reduce ${name}`);
  report.models.push({ input, output, before, after, reduction: `${(100 * (1 - after/before)).toFixed(1)}%` });
}
for (const surface of ['plaster', 'concrete', 'asphalt', 'tile', 'grass']) {
  const material = createSurface(surface);
  for (const [slot, map] of [['color', material.map], ['normal', material.normalMap], ['roughness', material.roughnessMap]]) {
    const { data, width, height } = map.image, output = `public/assets/textures/${surface}-${slot}.webp`;
    await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).webp({ lossless: true, effort: 6 }).toFile(output);
    report.textures.push({ output, width, height, bytes: (await stat(output)).size }); map.dispose();
  }
  material.dispose();
}
for (const name of ['draco_wasm_wrapper.js', 'draco_decoder.wasm', 'draco_decoder.js']) {
  const output = `public/assets/draco/${name}`;
  await copyFile(`node_modules/three/examples/jsm/libs/draco/gltf/${name}`, output);
  report.decoderBytes += (await stat(output)).size;
}
await copyFile('node_modules/three/LICENSE', 'public/assets/draco/THREE-LICENSE.txt');
await copyFile('node_modules/draco3dgltf/README.md', 'public/assets/draco/DRACO-README.md');
await copyFile('tools/licenses/DRACO-LICENSE.txt', 'public/assets/draco/LICENSE.txt');
await writeFile('public/assets/optimized/report.json', JSON.stringify(report, null, 2) + '\n');
// Verify all exported model payloads advertise Draco, rather than just renaming files.
for (const { output } of report.models) {
  const bytes = await readFile(output), json = JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  if (!json.extensionsRequired?.includes('KHR_draco_mesh_compression')) throw Error(`Missing Draco extension: ${output}`);
}
console.log(JSON.stringify({ models: report.models, textureCount: report.textures.length,
  textureBytes: report.textures.reduce((sum, texture) => sum + texture.bytes, 0), decoderBytes: report.decoderBytes }, null, 2));
