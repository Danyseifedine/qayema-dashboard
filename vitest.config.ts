import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    // config/env.ts validates these at import time, so the suite needs real
    // values even though every request is mocked.
    env: {
      VITE_API_URL: 'https://qayema.test',
      VITE_LOGIN_URL: 'https://qayema.test/get-started',
    },
    globals: true,
    setupFiles: ['./src/test/setup/vitest.setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.test.*',
        'src/test/**',
        'src/locales/**',
        // Barrels that only re-export; lib/api and lib/i18n index files hold
        // logic and stay measured.
        'src/features/**/index.ts',
        'src/shared/components/*/index.ts',
      ],
      reporter: ['text-summary', 'html'],
      // The achieved numbers, rounded down: a change that drops coverage
      // fails `npm run test:coverage`.
      thresholds: {
        lines: 100,
        statements: 99,
        functions: 100,
        branches: 98,
      },
    },
  },
})
