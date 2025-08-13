import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  root: ".",
  base: "./", // ✅ Makes assets load via relative paths in production
  build: {
    outDir: "dist", // ✅ Matches what your Electron code expects
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src") // optional alias for cleaner imports
    }
  }
})
