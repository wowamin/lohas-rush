import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Include every built chunk (including lazy scenes) and the game's local models.
// Reference photos and the independent care-city page are not game dependencies.
export function pwaPlugin() {
  let config;
  return {
    name: 'lohas-offline', apply: 'build', enforce: 'post',
    configResolved(resolved) { config = resolved; },
    generateBundle(_options, bundle) {
      const hash = createHash('sha256');
      const files = ['index.html'];
      for (const [name, output] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) {
        if (name.endsWith('.map')) continue;
        files.push(name);
        hash.update(name).update(output.type === 'chunk' ? output.code : output.source);
      }
      const walk = (directory, prefix = '') => {
        for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
          const name = prefix + entry.name, absolute = join(directory, entry.name);
          if (entry.isDirectory()) walk(absolute, name + '/');
          else if ((/\.(glb|hdr|webp|ktx2)$/.test(name) || name.startsWith('assets/draco/') || name.startsWith('icons/') || name === 'manifest.webmanifest') &&
            !['lohas_building_reference.glb','grandma_wheelchair.glb','grandpa_wheelchair.glb','assets/models/lohas_service_van.glb'].includes(name)) {
            files.push(name); hash.update(name).update(readFileSync(absolute));
          }
        }
      };
      walk(config.publicDir);
      hash.update(readFileSync(join(config.root, 'index.html')));
      const template = readFileSync(new URL('./pwa-service-worker.js', import.meta.url), 'utf8');
      hash.update(template);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: template
        .replace("'__BUILD__'", JSON.stringify(hash.digest('hex').slice(0, 20)))
        .replace('/* precache */ []', JSON.stringify([...new Set(files)].sort())) });
    },
  };
}
