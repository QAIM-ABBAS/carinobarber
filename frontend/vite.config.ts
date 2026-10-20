import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // The configuration lives in the .env file of the repository root, next to the
  // docker-compose.yml (see .env.example).
  const env = loadEnv(mode, '..', '')
  // The dev proxy forwards `/api` to the backend. API_PROXY_TARGET wins, otherwise
  // the published port of the API (API_PORT) is used.
  const apiTarget = env.API_PROXY_TARGET || `http://localhost:${env.API_PORT || 8000}`

  return {
    envDir: '..',
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
