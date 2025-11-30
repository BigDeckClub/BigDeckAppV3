import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  build: {
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        // Console logs intentionally kept for debugging in production
        // Per project requirements: console logs help diagnose issues
        drop_console: false,
        drop_debugger: true,
      },
    },
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
    // Generate hidden source maps for debugging without exposing them to users
    sourcemap: 'hidden',
    // Target modern browsers
    target: 'es2020',
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
})
