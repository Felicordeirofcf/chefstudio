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
    outDir: 'dist',
    sourcemap: false,
    minify: true,
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
  css: {
    devSourcemap: false,
  },
  // Desabilitar warnings
  logLevel: process.env.VITE_DISABLE_WARNINGS === 'true' ? 'error' : 'info',
})
