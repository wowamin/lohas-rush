import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pwaPlugin } from './tools/pwa-plugin.mjs';

export default defineConfig({
  plugins: [react(), pwaPlugin()],
  base: './',
  // Windows can lock screenshots while Chrome saves a capture. These generated
  // artifacts are not application sources and must not enter Vite's file watcher.
  server: { watch: { ignored: ['**/.test-artifacts/**', '**/art/buildings/world-refinement/**', '**/tools/licenses/**', '**/public/assets/optimized/**', '**/public/assets/textures/**', '**/public/assets/draco/**'] } },
});
