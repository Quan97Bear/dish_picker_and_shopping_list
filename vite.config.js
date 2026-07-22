import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  publicDir: 'public',
  build: { outDir: 'dist', sourcemap: false },
  test: { environment: 'node', include: ['tests/**/*.test.js'] }
});
