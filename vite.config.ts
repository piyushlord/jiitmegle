import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { devSignalingPlugin } from './dev-server/viteSignalingPlugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devSignalingPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
