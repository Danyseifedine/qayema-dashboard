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
    setupFiles: ['./src/test/setup.ts'],
    // The longest form tests take under 2s alone, but the full run puts 135
    // files on every core at once (more again with coverage), and 5s was
    // tripped by load alone. A stuck test still fails.
    testTimeout: 15000,
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
      reportsDirectory: '.test-output/coverage',
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
