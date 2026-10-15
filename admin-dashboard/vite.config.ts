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
<<<<<<< HEAD
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'https://course-app-na94.onrender.com',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_PROXY_TARGET || 'https://course-app-na94.onrender.com',
        changeOrigin: true,
      },
      // Realtime (socket.io). Without this the dashboard socket never reaches the server.
      '/socket.io': {
        target: process.env.VITE_PROXY_TARGET || 'https://course-app-na94.onrender.com',
        changeOrigin: true,
        ws: true,
      },
    },
=======
>>>>>>> 6528297da9fd09fefc606f27a6e6edb2a0abd07c
  },
});
