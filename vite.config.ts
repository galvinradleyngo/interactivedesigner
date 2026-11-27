import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The authoring app. The player is built separately (vite.player.config.ts)
// into public/player so the app can preview it and embed it in exports.
export default defineConfig({
  base: '/interactivedesigner/',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
  test: {
    environment: 'jsdom',
    include: ['src/tests/**/*.test.ts'],
  },
});
