import { defineConfig, loadEnv, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()] as PluginOption[],
    server: {
      port: 5174, // Updated to 5174
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001', // Ensure this points to http://localhost:3001
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@lib': path.resolve(__dirname, './src/lib')
      }
    },
    build: {
      outDir: 'dist/client',
      emptyOutDir: true,
      sourcemap: mode === 'development'
    }
  };
});