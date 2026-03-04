import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const suffix = env.PORTLESS_SUFFIX
  const apiName = suffix ? `api-${suffix}` : 'api'
  const apiTarget =
    env.PORTLESS === '0'
      ? 'http://localhost:3001'
      : `http://${apiName}.localhost:1355`

  return {
    plugins: [TanStackRouterVite({ target: 'react' }), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
