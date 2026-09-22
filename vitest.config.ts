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
  },
})
