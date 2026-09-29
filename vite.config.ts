import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * The app is a single-route-less SPA, so every dependency lands in one
         * chunk and trips the 500 kB warning. Splitting the heavy vendors out is
         * the cheap fix: it clears the warning and lets a dependency-only change
         * bust the cache on one file instead of all of them.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('@firebase') || id.includes('/firebase/')) return 'vendor-firebase';
          if (id.includes('leaflet')) return 'vendor-leaflet';
          if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark') || id.includes('mdast') || id.includes('hast') || id.includes('unified') || id.includes('vfile') || id.includes('unist')) {
            return 'vendor-markdown';
          }
          if (id.includes('framer-motion') || id.includes('/motion/') || id.includes('motion-dom') || id.includes('motion-utils')) {
            return 'vendor-motion';
          }
          if (id.includes('date-fns')) return 'vendor-date';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
            return 'vendor-react';
          }
          return 'vendor';
        },
      },
    },
  },
});

