import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // The configuration of the stack lives in the .env file of the repository root
  // (next to docker-compose.yml, see .env.example).
  const env = loadEnv(mode, '..', '')
  // The dev server forwards `/api` to the backend. Inside docker compose the target
  // is the service name (resolved by Docker DNS), outside it is the published port.
  const apiTarget =
    process.env.API_PROXY_TARGET ||
    env.API_PROXY_TARGET ||
    `http://localhost:${env.API_PORT || 8000}`

  return {
    envDir: '..',
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      // The local dev server uses the vite default (5173); the container overrides it
      // with --port 8081 (see frontend/Dockerfile).
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
