import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' para o build funcionar dentro do Electron (file://)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5178,
    strictPort: true,
  },
});
