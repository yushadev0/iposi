import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Prod: app is served under https://yusa.app/iposi/  -> base is fixed to that path.
// Dev:  base '/', and /api is proxied to the local Express server on :3001.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/iposi/' : '/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            '@uiw/react-codemirror',
            '@uiw/codemirror-theme-monokai',
            '@codemirror/lang-json',
            '@codemirror/lang-html',
            '@codemirror/lang-xml',
            '@codemirror/lang-javascript',
          ],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
}));
