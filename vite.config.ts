import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pwaPlugin } from './tools/pwa-plugin.mjs';

export default defineConfig({
  plugins: [react(), pwaPlugin()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Three ships separate core and WebGL modules. Keep that boundary so
        // neither the renderer nor the game becomes one oversized download.
        manualChunks(id) {
          const path = id.replace(/\\/g, '/');
          if (path.endsWith('/three/build/three.core.js')) return 'three-core';
          if (path.endsWith('/three/build/three.module.js')) return 'three-webgl';
          if (path.includes('/node_modules/three/')) return 'three-addons';
          if (path.includes('/node_modules/')) return 'runtime';
        },
      },
    },
  },
  // Windows can lock screenshots while Chrome saves a capture. These generated
  // artifacts are not application sources and must not enter Vite's file watcher.
  server: { watch: { ignored: ['**/.test-artifacts/**', '**/art/buildings/world-refinement/**', '**/tools/licenses/**', '**/public/assets/optimized/**', '**/public/assets/textures/**', '**/public/assets/draco/**'] } },
});
