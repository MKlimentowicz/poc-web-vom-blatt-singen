import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/poc-web-vom-blatt-singen/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'docs',
  },
})
