// client/vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load all env variables (only VITE_* are exposed to client)
  const env = loadEnv(mode, process.cwd(), '');

  // Validate required environment variables
  const requiredVars = ['VITE_BACKEND_URL', 'VITE_PORT'];
  for (const varName of requiredVars) {
    if (!env[varName]) {
      throw new Error(`${varName} is required in .env`);
    }
  }

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT),
      strictPort: true, // Exit if port is in use
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('Proxy Error:', err);
            });
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@hooks': path.resolve(__dirname, './src/hooks')
      }
    },
    build: {
      outDir: '../dist/client',
      emptyOutDir: true,
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            vendor: ['lodash', 'date-fns']
          }
        }
      }
    },
    define: {
      'process.env': {},
      __APP_ENV__: JSON.stringify(env.APP_ENV)
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom']
    }
  };
});