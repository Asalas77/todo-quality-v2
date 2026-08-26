import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Puerto fijo para no chocar con otros proyectos (ej. ITOP, que usa el 5173 por defecto).
  server: { port: 4173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
