import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cross-origin isolation (COOP/COEP) is REQUIRED for SharedArrayBuffer +
// Atomics, which powers the interactive/live stdin in the Console (a program
// blocking on cin/scanf would otherwise make the input inaccessible over the
// LAN on an iPhone). These headers must be present on BOTH the dev server and
// the preview server so `http://192.168.x.x:5173` works on other devices.
const COOP_COEP = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // host true binds to 0.0.0.0 so other devices on the network can reach
    // the dev server via the machine's LAN IP (required for iPhone testing).
    host: true,
    port: 5173,
    headers: COOP_COEP,
  },
  preview: {
    host: true,
    port: 4173,
    headers: COOP_COEP,
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});