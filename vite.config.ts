import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/omniai/', // GitHub Pages repo name - change to '/' for custom domain
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'langchain': ['@langchain/core', '@langchain/community'],
          'markdown': ['react-markdown', 'react-syntax-highlighter', 'remark-gfm'],
          'db': ['dexie', 'dexie-react-hooks'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'dexie'],
  },
  server: {
    port: 5173,
    host: true,
  },
})
