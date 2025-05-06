import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url"; // Import URL and fileURLToPath

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)), // Use URL and fileURLToPath
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001", // Use variable for API URL or default to localhost
        changeOrigin: true,
        secure: process.env.VITE_API_URL ? true : false, // Set secure to true in production environments
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor"; // Group all dependencies into a single chunk
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit (default is 500 KB)
  },
});
