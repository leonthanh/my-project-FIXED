import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useHttps = mode === 'development' && env.DEV_HTTPS !== 'false';

  return {
    plugins: [react(), useHttps ? basicSsl() : null].filter(Boolean),
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx'
        }
      }
    },
    base: '/',
    server: {
      host: 'localhost',
      port: 3000,
      https: useHttps,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});
