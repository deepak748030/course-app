import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * No proxy: the browser talks straight to the backend server. Set the server's
 * URL in .env as VITE_API_URL (see .env.example) — src/api/client.ts builds
 * every API, upload and socket URL from it.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // 0.0.0.0 — reachable through the preview proxy
    port: 5173,
    allowedHosts: true,
  },
});
