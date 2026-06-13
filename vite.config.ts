import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Repo is served from https://reedahlstrom.github.io/Reed-Apps/
// When a custom domain is added later, set base back to '/'.
export default defineConfig({
  base: '/Reed-Apps/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
