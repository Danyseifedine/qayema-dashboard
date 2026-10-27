# Qayema Dashboard: Architecture

> Owner-facing SPA for Qayema. React 19 + Vite + TypeScript, talking to the
> Laravel API in `../qayema` over a Sanctum session cookie. This document says
> what each folder is for, which packages we use, and the rules that keep the
> codebase readable. It describes the tree as it **is**; when the tree changes,
> this file changes with it.

**Working rules live in [CLAUDE.md](../CLAUDE.md):** never commit (the user
does), never leave a component unused, always use the shared component instead
of re-implementing it, always report status truthfully.

---

## 1. Principles

1. **Feature-first.** Code is grouped by what the owner is doing
   (`features/menu`, `features/design`), not by technical role. A feature owns
   its API calls, schemas, components, hooks and pages.
2. **One name per thing.** The sidebar label, the page heading, the feature
   folder, the i18n namespace and the query root all use the same word. The
   table in §2 is the vocabulary; the backend's `CLAUDE.md` has the same table
   for its side.
3. **One owner per kind of state.**
   | Kind of state                                | Owner                  | Never put it in        |
   | -------------------------------------------- | ---------------------- | ---------------------- |
   | Server data (categories, stats, the session) | TanStack Query         | Zustand, React context |
   | UI preferences (sidebar, language)           | Zustand (`src/stores`) | Query cache            |
   | Form state                                   | React Hook Form + Zod  | Zustand                |
   | Which page is open                           | The URL (`usePageKey`) | Zustand, `useState`    |
4. **Validate at every boundary.** Env vars, API responses and form input all
   pass through Zod schemas. Nothing untyped leaks past `lib/` or `features/*/api`.
5. **Dependency direction is one way.**
   `app → features → shared → lib → config`. A feature imports another feature
   only through its `index.ts` barrel; `App.tsx` takes pages from
   `features/<name>/pages` (§3). `shared` never imports from `features`
   or `app`. Every import uses the `@/` alias, even inside a feature.
6. **The tree below is the tree.** Adding a file into an existing folder is
   routine. Adding, renaming or removing a folder means updating §2 in the
   same change. If that feels wrong, it is a design discussion first.
7. **Bilingual and RTL from day one.** Every user-visible string goes through
   i18n; layout uses logical CSS properties so Arabic RTL is free.

---

## 2. Folder tree

### Vocabulary

One word per page, used everywhere. `plan`, `grant` and `switched off` are
explained in §2 of the backend `CLAUDE.md`.

| Sidebar (group)           | Feature folder · nav key · i18n namespace · query root | API                                               |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Overview                  | `overview`                                             | `/api/user`, `/api/restaurant`                    |
| Analytics                 | `analytics`                                            | `/api/analytics[/advanced,/teaser]`               |
| Categories, Dishes (MENU) | `menu` (sub-features `categories`, `dishes`)           | `/api/categories`, `/api/dishes`                  |
| Offers (MENU)             | `offers`                                               | `/api/offers[/reorder,/{id}/active]`              |
| Build your own (MENU)     | `build-your-own` (a build is its dish; `dishKeys`)     | `/api/dishes` (a dish with `builds`)              |
| Design (LOOK)             | `design`                                               | `/api/templates` (a design is a `Template` row)   |
| Appearance (LOOK)         | `appearance`                                           | `/api/appearance`                                 |
| Orders (ORDERS)           | `orders`                                               | `/api/orders[/pulse]` (`?kind=away`)              |
| Table orders (ORDERS)     | `table-orders` page inside `orders`                    | `/api/orders?kind=table`                          |
| Tables (SHARING)          | `tables`                                               | `/api/tables[/{id}/new-code]`                     |
| QR code (SHARING)         | `qr`                                                   | `/api/qr`                                         |
| Social links (SHARING)    | `social-links`                                         | `/api/social-links`                               |
| Restaurant (SETTINGS)     | `restaurant`                                           | `/api/restaurant`                                 |
| Features (SETTINGS)       | `features` page inside `restaurant`                    | `/api/features[/ordering]`, `/api/menu-languages` |
| Package (SETTINGS)        | `package`                                              | `/api/packages`                                   |
| Account (avatar menu)     | `account`                                              | `/api/account`, `/api/password`                   |

Two features have no page: `auth` (the session, the gate, logout, the menu
languages read from the session) and `uploads` (temp image upload and the
`ImageField` that uses it).

### Tree

```
qayema-dashboard/
├── CLAUDE.md                        Working rules for agents
├── docs/ARCHITECTURE.md             This file
├── e2e/                             Playwright, whole product (§7)
│   ├── playwright.config.ts         Servers, projects (desktop, phone, arabic-rtl, visual, visual-phone)
│   ├── global-setup.ts              composer e2e:reset before a run
│   ├── specs/                       dashboard/, public/ (menu, portal, auth, onboarding),
│   │                                admin/, quality/ (a11y, visual, errors)
│   ├── support/                     fixtures.ts, helpers.ts, urls.ts, files/ (upload fixtures)
│   └── snapshots/                   Visual baselines, per project (committed)
├── public/                          Served as-is
└── src/
    ├── main.tsx                     Entry: providers + App
    ├── App.tsx                      SessionGate, the shell, which page is open (§4)
    ├── vite-env.d.ts
    ├── config/env.ts                Zod-validated import.meta.env
    ├── styles/                      globals.css, tokens.css (colour tokens), rtl.css
    ├── assets/images/brand/         Wordmark and Q mark
    ├── locales/<code>/              meta.json + one JSON per namespace (§6)
    ├── stores/                      preferences.store.ts (locale), ui.store.ts (sidebar, the Overview guide)
    ├── lib/
    │   ├── api/                     axios client, request(), interceptors/{csrf,auth-redirect,locale},
    │   │                            report-error (errors to the backend's log)
    │   ├── i18n/                    loader (discovers locales/*), resources.ts (typed keys), parity test
    │   ├── query/                   QueryClient, QUERY_ROOTS
    │   ├── realtime/                echo.ts: Laravel Echo on Pusher, made on first use (null without a key)
    │   └── security/                input-guards.ts, safe-redirect.ts
    ├── app/
    │   ├── providers/               app-providers, query-provider, toast-provider
    │   └── layouts/authenticated/   authenticated-layout, nav-items (the sidebar table), use-page-key (the URL),
    │       │                        more-page (the phone's More tab), plan-locked-page (a section the package
    │       │                        lacks), menu-offline (page and grace-days banner), impersonation-banner
    │       ├── bottom-tabs/         the phone's four tabs
    │       ├── sidebar/             sidebar, sidebar-group, sidebar-item, rail-tooltip (a row's name on the rail)
    │       └── topbar/              topbar (every page's heading), use-page-hero (its words), user-menu,
    │                                package-pill, package-tier, language-switcher
    ├── shared/                      Used by more than one feature; knows nothing about features
    │   ├── components/ui/           Primitives: button, input, switch, combobox, segmented, alert,
    │   │                            action-menu (the ⋮), filter-chips, stepper (an editor's steps)…
    │   ├── components/forms/        fields/ (text, price, color, choice, date, time…), layout/ (Form, FormSection, Field),
    │   │                            translatable/ (TranslatableTextField, LocaleTabs, writing help), index.ts
    │   ├── components/feedback/     dialogs/{modal,confirm-dialog}, skeletons/{skeleton,card-grid,page},
    │   │                            states/{empty,picture-empty,error,error-boundary,locked,gold-notice},
    │   │                            toasts/{toast,copy-with-toast}, index.ts
    │   ├── components/data-display/ badges/{limit-badge,limit-notice}, formatters/money,
    │   │                            stats/{stat-tile,change-line (a number's change vs before)}
    │   ├── constants/               countries, currencies, locales (UI languages), menu-languages
    │   ├── hooks/                   use-api-form-errors, use-dismiss, use-submit-once, use-writing-help
    │   ├── types/                   api.ts
    │   └── utils/                   dom/cn, color/contrast, format/{money,change,date,number,clock}, string/{menu-text,translated},
    │                                limits/is-at-limit (a package's allowance used up)
    ├── features/                    One folder per row of the vocabulary table (§3); build-your-own/
    │                                (components/editor: the steps; components/list: the cards)
    └── test/                        setup.ts, render-with-providers.tsx, sortable.ts (keyboard drags in jsdom),
                                     factories/{session (FULL_PLAN, EMPTY_PLAN), packages, menu}
```

---

## 3. Anatomy of a feature

Every `features/<name>/` has the same shape, so learning one teaches all:

```
features/restaurant/
├── api/          restaurant.api.ts, features.api.ts, menu-languages.api.ts   # HTTP + response schemas
├── schemas/      restaurant.schema.ts                                        # response + form schemas
├── hooks/        restaurant-keys.ts, use-restaurant.ts, use-features.ts, …   # queries and mutations
├── components/   identity/ contact/ hours/ branding/ features/                # grouped by area
├── utils/        time-options.ts, describe-language.ts                        # not components
├── pages/        restaurant-page.tsx, features-page.tsx, __tests__/,          # what App.tsx renders
│                 index.ts (the pages, for App.tsx only)
└── index.ts      the ONLY path other features may import from (never a page)
```

- `api/` functions return **parsed** data (`request(schema, …)`), never raw
  axios payloads, so a backend contract change fails loudly in dev.
- Query keys come from the feature's `<name>-keys.ts` factory. Never
  hand-write key arrays, including for invalidation across features
  (`sessionKeys.all`, `qrKeys.all` through the barrels).
- Mutations invalidate by key prefix, and use optimistic updates with rollback
  where the UX needs it (reorder, availability, the Features switches).
- Components are grouped by area subfolder; adding a component is adding a
  file. Dialogs always sit in `dialogs/`, filters in `filters/`. A file that
  is not a component (`qr/utils/qr-options.ts`, `analytics/utils/chart-style.ts`)
  lives in `utils/`, not under `components/`.
- A page file holds the page and the tables it reads (the Features page's
  `GROUPS` and `ROWS`); each part it is built from is a component of its
  own in its area (`restaurant/components/features/`: `FeatureRow`,
  `OrderingChoice`, `MainLanguageField`…; `qr/components/studio/`:
  `QrStudio`, `StudioLocked`), with its tests beside it.
- The barrel exports only what someone outside actually imports: hooks, key
  factories and a few types; never a whole folder and **never a page**. A
  page in a barrel comes along with every hook another feature imports from
  it (it once put Menu, Package and drag and drop in the first download).
  Pages are exported by `pages/index.ts`, which only `App.tsx` imports, as a
  `lazy()` chunk (`src/__tests__/App.pages.test.ts` holds both rules).
- `menu` is the one composite feature: `categories/` and `dishes/` are
  sub-features with the same shape, and `menu/components/` holds what both
  share (`dnd/`, `filters/` with the category filter, and `nav/` with
  `MenuSwitch`, the phone's switch between the two pages). Its two pages sit in `menu/pages`.
  `dishes/components/` has `dialogs/` (the dish form), `list/` (the card) and
  `options/` (the dish form's variants and add-ons section, whose rows
  `build-your-own` reuses from the barrel).

---

## 4. Navigation

There is no router library. Each nav key is a path (`/categories`,
`/social-links`), and `usePageKey` in `app/layouts/authenticated/use-page-key.ts`
reads and writes it with the History API: opening a page pushes its path, the
back and forward buttons follow `popstate`, and a refresh or a shared link
opens the same page. `/` or a path that is no page lands on Overview (Design
before a design is chosen) and the URL is rewritten to say so. `App.tsx` calls
the hook, the sidebar calls `onNavigate`, and `PAGE_VIEWS` (one line per
nav key, each drawing its page from what App hands it) renders the page
once the locks and the offline screen have had their say. A page handed over rather than chosen (a section switched off while
open) replaces the history entry instead of pushing one.

The host serving `dist/` must answer every path with `index.html` (the SPA
fallback). Vite's dev and preview servers already do.

`app/layouts/authenticated/nav-items.ts` is the single table behind the
sidebar, the topbar title, the locks and the Features switches:

- `requiresTemplate`: locked until a design is chosen (Categories, Dishes,
  Appearance, Orders, QR code, Restaurant). Design is always open: it is
  the way out.
- `requiresPlan`: locked unless `restaurant.plan[flag]` is true (Analytics
  needs `analytics`, Appearance `appearance`, Orders `ordering`, Build your own
  `build_your_own`). Gating a new section is one line here, not a new branch.

`navLock(key, access)` says why a section is closed, and the two reasons look
different on purpose:

- `'template'`: the row is disabled and the page says "Choose a menu design
  first"; there is nothing to work on yet.
- `'plan'`: the sidebar leaves the row out (`isOnPlan`), heading too when a
  group is left empty; the Package page is where an owner sees what more
  packages bring. Opened by a link, the page is `PlanLockedPage`: what the
  section gives, the package that has it, and "See packages". Analytics adds
  this week's views (`AnalyticsTeaser`, `GET /api/analytics/teaser`). A flag
  no package carries (`useOnNoPackage`, e.g. `build_your_own`) is asked for
  instead: `TurnedOffNotice` with `ask="on"`, "Ask us to turn it on".

"The package that has it" is `usePackageFor(flag, locale)` from the package
barrel: the first package in the catalogue's order with the flag on. In-page
locks use the same component, `LockedState` (`shared/components/feedback`):
the QR studio, advanced analytics. The Design page marks a premium design and
points a locked one to the Package page; the Features page marks a switch the
package lacks and hides the language pickers without `multiple_languages`.

**Turned off** is a fourth word: a flag an admin forced off for one
restaurant (`restaurant.turned_off`, already false in `plan`). It locks
exactly what a missing flag locks, but is never sold: `useTurnedOff(flag)`
(`features/auth`) swaps the upsell for `TurnedOffNotice` (package barrel:
"Turned off for your restaurant", "Contact us" opening the package request
with a note naming the feature) on `PlanLockedPage`, the QR studio, advanced
analytics and the Design page (whose locked premium cards are then disabled);
the Features page's chip (`PackageChip`), the analytics range tooltip and the
Package page's "On your package" list say "turned off" instead of naming a
package.

- `hideable`: leaves the sidebar when its key is in `restaurant.switched_off`
  (Analytics, Orders). A page switched off while open hands over to Overview.
- `ACCOUNT_ITEM` is a page without a sidebar row; the avatar menu opens it.

Start page: Overview, or Design when no design is chosen yet.

---

## 5. Security

The backend already provides rate limiting, abuse bans, security headers and
Sanctum stateful auth. The SPA's responsibilities:

| Concern        | Approach                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Session        | Cookie only. **No tokens in localStorage/sessionStorage, ever.**                                                  |
| CSRF           | `lib/api/interceptors/csrf.ts` primes `/api/csrf-token` once and retries once on 419.                             |
| XSS            | React escaping by default. No `dangerouslySetInnerHTML` anywhere today.                                           |
| Open redirects | `lib/security/safe-redirect.ts` allowlists the API origin and same-origin paths.                                  |
| Env            | `config/env.ts` parses `import.meta.env` with Zod at boot; bad config fails the build, not the user.              |
| Input          | Every form has a Zod schema mirroring the API rules (lengths, price ≥ 0, allowed platforms).                      |
| Uploads        | `lib/security/input-guards.ts` checks MIME and size before POST; the server re-validates. Only the key is stored. |
| Errors         | Console in dev only. **No third-party telemetry.**                                                                |
| Money          | Nothing is charged in the SPA. A package request is a message to the admin; the package is assigned server-side.  |

---

## 6. Internationalisation

- `i18next` + `react-i18next`. `src/locales/<code>/` holds `meta.json` (name,
  short label, `ltr`/`rtl`) and one JSON per namespace. `lib/i18n/index.ts`
  discovers the files at build time, so **adding a language is copying
  `locales/en/` and translating it**; nothing else changes. English is built
  in (the fallback); every other language is its own file
  (`locale-<code>-….js`), downloaded the first time it is chosen
  (`setLanguage`), and `main.tsx` waits for the owner's language before the
  first paint (`languageReady`). The tests load every language up front.
- Namespaces are the feature folders: `common` (the shell and shared
  components), `overview`, `analytics`, `menu`, `offers`, `build-your-own`, `design`,
  `appearance`, `orders`, `qr`, `social-links`, `restaurant`, `features`, `package`,
  `account`. A new namespace is registered once in `lib/i18n/resources.ts`, which
  types the keys.
- `lib/i18n/__tests__/translations.test.ts` fails on any key missing from a language or
  any plural form missing (Arabic needs zero/one/two/few/many/other).
- Preference stored by `stores/preferences.store.ts` and mirrored onto
  `<html lang dir>`; the API is told through `Accept-Language`.
- Tailwind logical utilities (`ms-`, `pe-`, `text-start`) instead of physical
  ones, so RTL needs no overrides.
- **Two kinds of language.** `shared/constants/locales.ts` is the dashboard's
  interface (en/ar). `shared/constants/menu-languages.ts` is what a restaurant's
  _menu_ can be written in: a main language the owner picks (any of them,
  `restaurant.main_locale`, English by default) plus one optional second
  language, read with `useMenuLanguages()` from `features/auth`, the main one
  first (`mainLanguageOf()`). Menu text is
  `Record<code, string|null>` (`menuTextSchema`); platform content (package
  and design names) is `{en, ar}` (`translatableTextSchema`). Both live in
  `shared/utils/string/menu-text.ts`.

---

## 7. Testing

| Layer                        | Tool                                            | Where                    |
| ---------------------------- | ----------------------------------------------- | ------------------------ |
| Unit (utils, schemas, items) | Vitest                                          | `__tests__/*.test.ts`    |
| Component / page             | Vitest + Testing Library + `axios-mock-adapter` | `__tests__/*.test.tsx`   |
| Translations                 | `translations.test.ts` (parity, plurals)        | `lib/i18n/__tests__`     |
| End-to-end                   | Playwright + `@axe-core/playwright`             | `e2e/specs/**/*.spec.ts` |

Fixtures: `test/factories/` (`makeSessionUser`, `FULL_PLAN`, `EMPTY_PLAN`,
`makePackage`, `PACKAGE_CATALOGUE`, menu factories),
`test/render-with-providers.tsx`, `test/sortable.ts` (`stubSortableRects`,
`moveDown`: a keyboard drag in jsdom). Tests run in English (set in
`test/setup.ts`, which also stubs `ResizeObserver` for recharts).
`npm run test:coverage` fails under the thresholds in `vitest.config.ts`.
Everything a run writes (coverage, the Playwright report and traces) goes to
the git-ignored `.test-output/`.

**End-to-end** (`e2e/`, `npm run e2e`): the real Laravel app with
`APP_ENV=e2e` (port 8001, its own SQLite database, `composer e2e:reset` before
each run) and Vite on 5174, both started by `e2e/playwright.config.ts`. The
backend's side of it lives in `../qayema/tests/E2e/`.

- Specs are grouped by surface: `specs/dashboard/` (one per page),
  `specs/public/` (menu, portal, sign-in, onboarding), `specs/admin/`,
  `specs/quality/` (axe, screenshots, error handling).
- `e2e/support/fixtures.ts`: `owner(input)` builds an owner through the backend's
  test-only `POST /__e2e/scenario` and signs the browser in; `scenario`,
  `signIn`, `setPackage`, `expectAccessible` (axe, WCAG 2.1 A/AA, serious and
  critical fail), `either(en, ar)` for labels in both languages,
  `daysFromNow`. The `page` fixture fails the test on any uncaught browser
  error or `console.error`. `e2e/support/helpers.ts`: `callApi` (the owner
  API with CSRF, to set something up behind the page), `openSidebar`,
  `guestMenu`, `fixtureFile` (`support/files/`). A helper two specs need goes
  there, never copied.
- **Each test builds its own owner** and never changes shared data (packages,
  designs, the admin), so tests run in parallel and in any order. No retries.
- Projects: `desktop` runs everything; `phone` and `arabic-rtl` re-run tests
  tagged `@matrix` (use `either()` or roles there); `visual` and
  `visual-phone` run `@visual` screenshot tests. After an intended design
  change: `npm run e2e:update-snapshots`, look at the new baselines, keep them.
- `E2E_SKIP_RESET=1` keeps the current e2e data (to run one spec while another
  run uses the same servers).

Gate before handing work back: `typecheck && lint && format:check &&
test:coverage && build && e2e`.

---

## 8. Packages

### Runtime

| Package                                                                          | Purpose                                       |
| -------------------------------------------------------------------------------- | --------------------------------------------- |
| `react`, `react-dom` (19)                                                        | UI                                            |
| `@tanstack/react-query`                                                          | Server state, caching, optimistic updates     |
| `zustand`                                                                        | UI preferences (locale, sidebar)              |
| `axios`                                                                          | HTTP                                          |
| `zod` (v4)                                                                       | Validation for env, API responses, forms      |
| `react-hook-form`, `@hookform/resolvers`                                         | Forms bound to Zod schemas                    |
| `i18next`, `react-i18next`                                                       | Bilingual EN/AR                               |
| `class-variance-authority`, `clsx`, `tailwind-merge`, `@tabler/icons-react`      | Primitives in `shared/components/ui`          |
| `downshift`                                                                      | The combobox                                  |
| `sonner`                                                                         | Toasts                                        |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@dnd-kit/modifiers` | Reordering categories and dishes              |
| `recharts`                                                                       | Analytics charts                              |
| `qr-code-styling`                                                                | Live QR preview (same version as the backend) |

### Dev / tooling

| Package                                                                              | Purpose                                                  |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `typescript`, `vite`, `@vitejs/plugin-react`, `oxlint`, `prettier`                   | Build, lint, format                                      |
| `tailwindcss`, `@tailwindcss/vite` (v4)                                              | Styling, built into the CSS (logical properties for RTL) |
| `husky`, `lint-staged`                                                               | Pre-commit lint/format                                   |
| `vitest`, `@vitest/coverage-v8`, `jsdom`                                             | Unit and component tests                                 |
| `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Component testing                                        |
| `axios-mock-adapter`                                                                 | API mocking in tests                                     |
| `@playwright/test`, `@axe-core/playwright`                                           | End-to-end, accessibility                                |

Do not add a dependency without the owner's approval.

---

## 9. Conventions

- **Files:** `kebab-case.ts(x)` for everything, components included;
  `use-*.ts` for hooks, `*-keys.ts` for query keys, `*.schema.ts`, `*.api.ts`,
  `*.store.ts`, and `*.test.ts(x)` in a `__tests__` folder inside the folder
  of what it tests, so a folder lists its code and one folder of tests.
- **Identifiers** use American `color`; English copy stays British ("colour").
- **Exports:** named only; each feature exposes an `index.ts` barrel.
- **Imports:** always `@/…`, never relative, even within a feature.
- **Components:** function components, props typed as `type XProps`, no default
  exports, no prop spreading onto DOM outside `ui/` primitives.
- **Async:** toasts live in the mutation hook; a write-and-wait mutation toasts
  on success and error, an optimistic one on error only. Every query has a
  skeleton and an `ErrorState` with retry.
- **Commits:** written by the user. Agents never commit.

---

## 10. Roadmap

| Item              | Note                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------- |
| A router library  | Only when a page needs its own sub-paths (e.g. `/dishes/12`); `usePageKey` covers one level |
| More menu designs | Each is a backend `Template` row plus a Blade view                                          |
