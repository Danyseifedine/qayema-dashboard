import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Host the dashboard is reached at in dev, e.g. dashboard.qayema.test served
  // through a Herd/Valet HTTPS proxy in front of the Vite dev server. Set
  // VITE_DEV_HOST to override.
  const devHost = env.VITE_DEV_HOST || 'dashboard.qayema.test'

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      // Allow the proxied .test hostname to reach the dev server.
      allowedHosts: [devHost],
      // The browser loads the app over https://<devHost> (port 443 via the
      // proxy), so point the HMR websocket there instead of localhost:5173.
      hmr: {
        host: devHost,
        protocol: 'wss',
        clientPort: 443,
      },
    },
  }
})
