import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: __dirname,
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
          target: env.VITE_BACKEND_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@lib': path.resolve(__dirname, 'src/lib'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@pages': path.resolve(__dirname, 'src/pages'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@shared': path.resolve(__dirname, '../shared')
      }
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      sourcemap: mode === 'development',
      rollupOptions: {
        external: ['drizzle-orm'],
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
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