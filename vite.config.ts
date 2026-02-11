import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/yampi': {
          target: 'https://api.dooki.com.br/v2',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/yampi/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Fraud Cloudflare/Yampi WAF by removing localhost traces
              // IMPORTANT: Origin must match the Target Domain to avoid "Invalid Origin" blocks
              proxyReq.setHeader('Origin', 'https://api.dooki.com.br');
              proxyReq.setHeader('Referer', 'https://api.dooki.com.br/');
              proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            });
          },
        },
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
