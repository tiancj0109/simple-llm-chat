import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative assets loading in production Electron bundle
  server: {
    port: 5173,
    strictPort: true
  }
});
