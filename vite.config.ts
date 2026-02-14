import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      // bind to localhost to avoid permission issues on some systems
      host: 'localhost',
      port: 5173,
      proxy: {
        // Proxy local API calls to the local Express server in development
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
        // Ensure Yampi calls go to the local backend proxy (server/index.js),
        // which will forward to the real Dooki/Yampi API with required headers.
        '/api/yampi': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
          // Keep the leading slash when rewriting so the proxied URL is correct
          rewrite: (path) => path.replace(/^\/api\/yampi/, '/api/yampi'),
        },
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Conexx Hub',
          short_name: 'Conexx',
          description: 'Gestão Inteligente para seu Negócio',
          theme_color: '#10b981',
          background_color: '#000000',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'pwa-icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
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
