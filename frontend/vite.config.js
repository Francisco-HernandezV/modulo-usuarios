import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // esbuild es el minificador por defecto de Vite en producción; lo dejamos
    // explícito para que la minificación de JS quede documentada y garantizada.
    minify: 'esbuild',
    // Separamos las dependencias grandes en chunks propios. Así el navegador
    // solo descarga recharts / react-colorful cuando entra a las vistas que las
    // usan (panel admin), y el vendor de React se cachea entre despliegues.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          'color-picker': ['react-colorful'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
