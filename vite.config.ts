import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: path.resolve(__dirname, 'client'),
    plugins: [
      react({
        babel: {
          plugins: [
            ['module:@preact/signals-react-transform'],
          ],
        },
      }),
    ],
    server: {
      port: parseInt(env.VITE_PORT) || 5174,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        }
      }
    },
    resolve: {
      alias: [
        {
          find: '@/',
          replacement: path.resolve(__dirname, 'client/src/')
        },
        {
          find: '@/lib/utils',
          replacement: path.resolve(__dirname, 'client/src/lib/utils.ts')
        }
      ]
    },
    build: {
      outDir: 'dist/client',
      emptyOutDir: true,
      sourcemap: mode === 'development',
      rollupOptions: {
        external: ['drizzle-orm'],
        onwarn(warning, warn) {
          // Suppress "use client" directive warnings
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && 
              (warning.message.includes('"use client"') || 
               warning.message.includes('"use server"'))) {
            return;
          }
          warn(warning);
        }
      }
    },
    optimizeDeps: {
      include: ['@shared/schema'],
      exclude: ['@tanstack/react-query', '@radix-ui/react-*']
    }
  };
});