import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// API в проде на том же mux, что и статика. На деве проксируем в бэкенд.
const API_TARGET = process.env.API_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  // относительные пути к ассетам — чтобы бандл работал при любой точке монтирования (go:embed)
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/jobs': API_TARGET,
      '/runs': API_TARGET,
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
