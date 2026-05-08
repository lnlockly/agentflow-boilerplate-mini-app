import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 plugin replaces postcss config entirely. DO NOT add a
// postcss.config.js or @tailwindcss/postcss — the Vite plugin does both
// scanning and transformation in one pass.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '0.0.0.0', port: 5173 },
  build: { outDir: 'dist', sourcemap: false },
});
