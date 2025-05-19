// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: true,
    // Adicionar esta configuração para suprimir os warnings de imports dinâmicos
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignorar warnings específicos de dynamic imports
        if (
          warning.code === 'DYNAMIC_IMPORT_ASSERTIONS' ||
          warning.message.includes('dynamic import cannot be analyzed')
        ) {
          return;
        }
        warn(warning);
      }
    }
  },
  // Configuração para evitar problemas com imports dinâmicos
  optimizeDeps: {
    exclude: ['@react-pdf/renderer']
  }
})
