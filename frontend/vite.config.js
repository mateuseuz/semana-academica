import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '^/atividades': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '^/inscricoes': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/encontros': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/_teste': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
