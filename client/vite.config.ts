import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        // Change when docker network configuration changes
        target: 'http://backend:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
