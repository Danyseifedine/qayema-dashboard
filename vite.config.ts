import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Host the dashboard is reached at in dev. Set VITE_DEV_HOST only when the
  // dev server sits behind an HTTPS proxy such as Herd or Valet, e.g.
  // dashboard.qayema.test. Left unset, the server is plain
  // http://localhost:5173 and HMR connects straight to it.
  const devHost = env.VITE_DEV_HOST

  return {
    plugins: [react(), tailwindcss()],
    // Pages load on demand (App.tsx), so the dev server would find what only
    // they use at their first visit and bundle it then, reloading the page
    // under whoever opened it (an end-to-end test, mid-load). Named here, it
    // is bundled at start instead. The production build is unaffected.
    optimizeDeps: {
      include: [
        'recharts',
        'qr-code-styling',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/modifiers',
        '@dnd-kit/utilities',
        'laravel-echo',
        'pusher-js',
      ],
    },
    // Resolves the `@/*` alias straight from tsconfig.app.json.
    resolve: { tsconfigPaths: true },
    build: {
      // Above this a chunk is worth a look (the budget in
      // scripts/check-bundle.mjs is what fails the build).
      chunkSizeWarningLimit: 400,
      rolldownOptions: {
        output: {
          // A page's chunk is named after its feature (`menu-…js`), not `pages-…js`.
          chunkFileNames: (chunk) => {
            const page = /features\/([^/]+)\/pages\/index\.ts$/.exec(chunk.facadeModuleId ?? '')
            return `assets/${page ? page[1] : '[name]'}-[hash].js`
          },
          codeSplitting: {
            groups: [
              // One file per extra language, downloaded when it is chosen.
              {
                name: (id) => {
                  const language = /src\/locales\/([^/]+)\/(?!meta\.json)/.exec(id)?.[1]
                  return language && language !== 'en' ? `locale-${language}` : null
                },
              },
              // Libraries that change less often than the app, apart, so a
              // release does not download them again.
              { name: 'react', test: /node_modules\/(react|react-dom|scheduler)\// },
              { name: 'query', test: /node_modules\/@tanstack\// },
              { name: 'forms', test: /node_modules\/(zod|react-hook-form|@hookform)\// },
              { name: 'i18n', test: /node_modules\/(i18next|react-i18next)\// },
            ],
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      // Allow the proxied .test hostname to reach the dev server.
      ...(devHost
        ? {
            // Behind a proxy the browser loads the app over https://<devHost>
            // on port 443, so the HMR socket has to be told to go there.
            allowedHosts: [devHost],
            hmr: { host: devHost, protocol: 'wss', clientPort: 443 },
          }
        : {}),
      // The end-to-end suite (`vite --mode e2e`) must not have a page reload
      // under it when a file is saved mid-run; the next page load still gets
      // the new code.
      ...(mode === 'e2e' ? { hmr: false } : {}),
    },
  }
})
