import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { Options } from './support/fixtures'
import { API_URL, DASHBOARD_URL } from './support/urls'

/** The dashboard's root: the servers start there, and reports go under it. */
const ROOT = fileURLToPath(new URL('..', import.meta.url))

/**
 * End-to-end suite: the real Laravel app (APP_ENV=e2e, its own SQLite file,
 * port 8001) and the real dashboard (Vite, port 5174), driven by a browser.
 * The owner's everyday servers on 8000 and 5173 are never touched.
 *
 * Every test builds the owner it needs (support/fixtures.ts), so tests share no
 * state and run in parallel. A flaky test is a bug: no retries.
 *
 * Projects: `desktop` runs everything; `phone`, `arabic-rtl` and `dark` re-run
 * the flows tagged @matrix; `visual` holds the screenshot baselines.
 */
export default defineConfig<Options>({
  testDir: './specs',
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  // Baselines are committed; everything a run writes goes to .test-output/.
  snapshotPathTemplate: '{testDir}/../snapshots/{projectName}/{arg}{ext}',
  reporter: [['list'], ['html', { open: 'never', outputFolder: `${ROOT}.test-output/e2e-report` }]],
  outputDir: `${ROOT}.test-output/e2e-results`,
  use: {
    baseURL: DASHBOARD_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'Asia/Beirut',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      grepInvert: /@visual/,
    },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'] },
      grep: /@matrix/,
    },
    {
      name: 'arabic-rtl',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        uiLanguage: 'ar',
      },
      grep: /@matrix/,
    },
    {
      name: 'dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        uiTheme: 'dark',
      },
      grep: /@matrix/,
    },
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      grep: /@visual/,
    },
    {
      name: 'visual-phone',
      use: { ...devices['Pixel 7'] },
      grep: /@visual/,
    },
  ],
  webServer: [
    {
      command: 'composer --working-dir=../qayema serve:e2e',
      cwd: ROOT,
      url: `${API_URL}/up`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npx vite --mode e2e --port 5174 --strictPort',
      cwd: ROOT,
      url: DASHBOARD_URL,
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        VITE_API_URL: API_URL,
        VITE_LOGIN_URL: `${API_URL}/get-started`,
      },
    },
  ],
})
