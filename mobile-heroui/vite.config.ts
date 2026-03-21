import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tailwindConfig from './tailwind.config.js';

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss(tailwindConfig), autoprefixer()],
    },
  },
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
