import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // Windows can lock screenshots while Chrome saves a capture. These generated
  // artifacts are not application sources and must not enter Vite's file watcher.
  server: { watch: { ignored: ['**/.test-artifacts/**', '**/art/buildings/world-refinement/**'] } },
});
