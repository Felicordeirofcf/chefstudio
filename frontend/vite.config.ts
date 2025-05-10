import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: isDev
      ? {
          proxy: {
            "/api": {
              target: process.env.VITE_API_URL || "https://chefstudio-production.up.railway.app", // Usando variável de ambiente
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : undefined,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
