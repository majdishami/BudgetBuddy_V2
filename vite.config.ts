import { defineConfig, loadEnv, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: path.resolve(__dirname, 'client'), // Ensure this points to the client directory containing index.html
    plugins: [react()] as PluginOption[],
    server: {
      port: 5174, // Ensure this is set to 5174
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
        '@': path.resolve(__dirname, 'client/src'),
        '@components': path.resolve(__dirname, 'client/src/components'),
        '@pages': path.resolve(__dirname, 'client/src/pages'),
        '@lib': path.resolve(__dirname, 'client/src/lib'),
        '@shared': path.resolve(__dirname, '../shared') // Added from client config
      }
    },
    build: {
      outDir: 'dist/client',
      emptyOutDir: true,
      sourcemap: mode === 'development',
      rollupOptions: {
        external: ['drizzle-orm'] // Add this line to externalize drizzle-orm module
      }
    },
    optimizeDeps: {
      include: ['@shared/schema'] // Added from client config
    }
  };
});