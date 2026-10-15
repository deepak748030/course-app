import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The dashboard talks straight to the backend server named in .env as
 * VITE_API_URL (see .env.example) — src/api/client.ts builds every API, upload
 * and socket URL from it. There is no dev-server forwarding layer in between.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // 0.0.0.0 — reachable from outside the sandbox
    port: 5173,
    allowedHosts: true,
  },
});
