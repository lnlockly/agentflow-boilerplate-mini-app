import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 plugin replaces postcss config entirely. DO NOT add a
// postcss.config.js or @tailwindcss/postcss — the Vite plugin does both
// scanning and transformation in one pass.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '0.0.0.0', port: 5173 },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['proj-4yd1s6x1-u1.proj.agentflow.website'],
  },
  build: { outDir: 'dist', sourcemap: false },
});
