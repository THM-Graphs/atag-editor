import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    // vite config
    base: mode === 'production' ? '/atag-editor/' : '/',
    envDir: '.',
    plugins: [vue()],
    /* TODO: Why does this not work?
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080/api',
          changeOrigin: true,
          secure: false,
        },
      },
    }, */
  };
});
