import { defineConfig } from 'vite';

// Framework-free player: one IIFE JS file + one CSS file, no external requests.
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'build/player',
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    lib: {
      entry: 'src/player/index.ts',
      name: 'ActivityPlayer',
      formats: ['iife'],
      fileName: () => 'player.js',
      cssFileName: 'player',
    },
  },
});
