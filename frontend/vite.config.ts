import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // The dev proxy forwards `/api` to the backend. Override it with API_PROXY_TARGET
  // in the .env file when the backend does not run on the default port.
  const env = loadEnv(mode, '', '')
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:8000'

  return {
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
