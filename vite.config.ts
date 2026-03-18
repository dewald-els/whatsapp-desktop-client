import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        settings: path.resolve(__dirname, 'src/renderer/index.html'),
        main: path.resolve(__dirname, 'src/renderer/main-window.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src')
    }
  },
  server: {
    port: 5173
  }
})
