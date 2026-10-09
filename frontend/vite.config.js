import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || Date.now().toString()

function versionPlugin() {
  const versionJson = JSON.stringify({ build: buildId })
  return {
    name: 'snm-version-json',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'GET' || request.url?.split('?')[0] !== '/version.json') return next()
        response.setHeader('Cache-Control', 'no-store')
        response.setHeader('Content-Type', 'application/json')
        response.end(versionJson)
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: versionJson })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [react(), versionPlugin()],
})
