import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained HTML file (app + player inlined) that works from file:// in any browser.
export default defineConfig({
  base: './',
  mode: 'single',
  publicDir: false,
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'build/single', emptyOutDir: true, sourcemap: false },
});
