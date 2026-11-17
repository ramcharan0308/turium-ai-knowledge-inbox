import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ingest': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/items': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/query': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
