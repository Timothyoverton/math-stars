import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/math-stars/' : '/',
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
  },
}))
