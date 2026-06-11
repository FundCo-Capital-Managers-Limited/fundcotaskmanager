import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      './txml': 'txml'
    }
  },

  optimizeDeps: {
    include: ['txml']
  },

  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 4000,

    // ← THIS IS THE KEY FIX for the new error
    commonjsOptions: {
      transformMixedEsModules: true
    },

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx')) return 'xlsx'
            if (id.includes('jspdf')) return 'jspdf'
            if (id.includes('pptxgenjs')) return 'pptxgenjs'
            if (id.includes('jszip')) return 'jszip'
            return 'vendor'
          }
        }
      }
    }
  }
})