import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // TODO: Why does this not work?
  // server: {
  //   proxy: {
  //     '/api': {
  //       target: 'http://localhost:8080/api',
  //       changeOrigin: true,
  //       secure: false,
  //     },
  //   },
  // },
});
