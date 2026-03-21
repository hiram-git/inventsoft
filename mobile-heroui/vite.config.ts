import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Proxy /api/* al backend Astro en dev
      '/api': {
        target: 'http://localhost:4321',
        changeOrigin: true,
      },
    },
  },
});
