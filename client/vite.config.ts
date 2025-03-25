import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');

  // Validate required variables
  if (!env.VITE_BACKEND_URL) {
    throw new Error('VITE_BACKEND_URL is required in .env');
  }

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT || '5174', 10),
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  };
});