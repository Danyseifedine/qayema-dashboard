# Qayema Dashboard

The restaurant owner's dashboard for [Qayema](../qayema): build the menu,
choose and style its design, share it as a QR code, take orders, read the
numbers. React 19 + Vite + TypeScript, talking to the Laravel app's JSON API
with the Sanctum session cookie.

Working rules and architecture: [CLAUDE.md](CLAUDE.md) and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Setup

```bash
npm install
cp .env.example .env      # VITE_API_URL, VITE_LOGIN_URL: the Laravel app
npm run dev               # http://127.0.0.1:5173
```

The Laravel app (`../qayema`, `composer serve`) must be running, and its
`CORS_ALLOWED_ORIGINS` / `SANCTUM_STATEFUL_DOMAINS` must list this origin.

## Production build

`npm run build` bakes the `VITE_` values into `dist/`, reading
`.env.production` (git-ignored; `https://qayema.com`) over `.env`. The server
only serves `dist/` and reads no `.env`, so a changed value means a rebuild.
`public/.htaccess` is copied into `dist/` and sends every page to
`index.html` on Apache.

## Commands

| Command                                                       | What it does                                                          |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev` / `npm run build` / `npm run preview`           | Develop, build, preview the build                                     |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | oxlint, `tsc -b`, Prettier                                            |
| `npm run test`                                                | Vitest: components, hooks, pages (jsdom)                              |
| `npm run test:coverage`                                       | The same, failing under the coverage thresholds in `vitest.config.ts` |
| `npm run e2e`                                                 | Playwright: the whole product in a real browser (below)               |
| `npm run e2e:ui`                                              | The same, in Playwright's UI                                          |
| `npm run e2e:update-snapshots`                                | Re-record the visual baselines after an intended design change        |

## End-to-end tests

`e2e/` drives the real Laravel app, this dashboard, the public menu and the
admin together. `npm run e2e` starts both servers itself on their own ports:
the backend with `APP_ENV=e2e` on **8001** (its own SQLite database, never your
MySQL) and Vite on **5174**. It rebuilds the e2e database first
(`composer e2e:reset`). Your everyday servers on 8000 and 5173 are untouched.

- `e2e/support/fixtures.ts`: `owner(input)` builds an owner on the backend
  (`POST /__e2e/scenario`: package and dates, design, languages, menu content,
  orders, visits…) and signs the browser in; `scenario`, `signIn`,
  `setPackage`, `expectAccessible` (axe). Any uncaught browser error fails the
  test.
- Every test builds its own owner, so tests share nothing and run in parallel.
  No retries: a flaky test is a bug.
- Projects: `desktop` runs everything; `phone`, `arabic-rtl` and `dark` re-run
  the flows tagged `@matrix`; `visual` and `visual-phone` compare the
  screenshots in `e2e/snapshots`.
- Specs: `e2e/specs/{dashboard,public,admin,quality}`; shared helpers in
  `e2e/support/helpers.ts`; the config is `e2e/playwright.config.ts`.
- Reports land in `.test-output/` (git-ignored): `e2e-report` (HTML),
  `e2e-results` (traces, videos), and `coverage` from `npm run test:coverage`.
