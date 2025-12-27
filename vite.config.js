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
    // Default chunk splitting is usually best
    // Remove manualChunks to fix dependency loading order issues
    // Generate hidden source maps for debugging without exposing them to users
    sourcemap: 'hidden',
    // Target modern browsers and mobile webviews
    target: 'es2020',
    // Chunk size warning limit (important for mobile)
    chunkSizeWarningLimit: 500,
    // Optimize for mobile performance
    cssCodeSplit: true,
    reportCompressedSize: true,
  },
})
