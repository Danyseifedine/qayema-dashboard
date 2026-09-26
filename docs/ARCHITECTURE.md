# Qayema Dashboard — Architecture

> Owner-facing SPA for Qayema. React 19 + Vite + TypeScript, talking to the
> Laravel API in `../qayema` over a Sanctum session cookie. This document is the
> contract the folder tree was generated from: what each folder is for, which
> packages we standardise on, and the rules that keep the codebase scalable.

**Working rules live in [CLAUDE.md](../CLAUDE.md):** never commit (the user
does), never leave a component unused, always use the shared component instead
of re-implementing it, always report status truthfully.

Status: **form library built.** The folder tree is complete, and the shared UI
primitives plus the whole form layer are implemented, tested and rendering.
Routing, i18n, the API client and the feature pages are still to come; see §10.

---

## 1. Principles

1. **Feature-first.** Code is grouped by business capability
   (`features/menu`, `features/packages`), not by technical role. A feature owns
   its API calls, schemas, components, hooks, local state and pages.
2. **One owner per kind of state.**
   | Kind of state                                               | Owner                         | Never put it in        |
   | ----------------------------------------------------------- | ----------------------------- | ---------------------- |
   | Server data (categories, packages, stats…)                  | TanStack Query                | Zustand, React context |
   | Client/UI state (sidebar open, builder selection, QR draft) | Zustand                       | Query cache            |
   | Form state                                                  | React Hook Form + Zod         | Zustand                |
   | URL state (range, filters, active tab)                      | TanStack Router search params | Zustand                |
3. **Validate at every boundary.** Env vars, API responses and form input all
   pass through Zod schemas. Nothing untyped leaks past `lib/` or `features/*/api`.
4. **Thin routes, fat features.** A file in `src/routes/` wires a URL to a page
   component and its loader; the page itself lives in `features/<name>/pages`.
5. **Dependency direction is one way.**
   `routes → features → shared → lib → config`. A feature never imports another
   feature's internals, only its `index.ts` barrel.
6. **The folder tree is final.** Every folder the project needs already exists.
   Future work adds **files**, never folders. A component belongs in an existing
   area folder; if none fits, that is a design discussion, not a new directory.
7. **Bilingual and RTL from day one.** Every user-visible string goes through
   i18n; layout uses logical CSS properties so Arabic RTL is free.

---

## 2. Folder tree

Each line is a folder and the files it will hold. Folders marked _(flat)_ take
files directly.

```
qayema-dashboard/
├── CLAUDE.md                     Working rules for agents
├── .github/workflows/            ci.yml — typecheck → lint → test → build
├── .husky/                       pre-commit (lint-staged), pre-push (typecheck)
├── docs/
│   ├── ARCHITECTURE.md           This file
│   └── adr/                      One file per hard-to-reverse decision
├── public/                       Served as-is: favicon, robots.txt, manifest
├── src/
│   ├── main.tsx                  Entry point
│   ├── app/                      Application shell — composition only, no domain logic
│   │   ├── providers/            app-providers, query-provider, i18n-provider, theme-provider, toast-provider
│   │   ├── router/               router.ts, context.ts, routeTree.gen.ts (generated)
│   │   ├── layouts/
│   │   │   ├── root/             RootLayout, RootErrorFallback, NotFound
│   │   │   ├── authenticated/    AuthenticatedLayout, nav-items.ts
│   │   │   └── blank/            BlankLayout (locked states, checkout return)
│   │   └── guards/               require-auth, require-onboarding, require-template
│   ├── routes/                   TanStack file-based tree — thin files only
│   │   └── _authenticated/       index.tsx + menu/ templates/ package/ qr/ social-links/ settings/ account/
│   ├── config/                   env.ts (Zod-parsed), constants.ts, feature-flags.ts, paths.ts
│   ├── lib/                      Infrastructure adapters — vendor wrappers, zero domain knowledge
│   │   ├── api/                  client.ts, request.ts, errors.ts
│   │   │   └── interceptors/     csrf.ts, auth-redirect.ts, normalise-error.ts
│   │   ├── query/                client.ts, keys.ts, mutation-helpers.ts
│   │   ├── i18n/                 index.ts, direction.ts, resources.ts
│   │   ├── security/             sanitize.ts, safe-redirect.ts, input-guards.ts
│   │   ├── logger/               index.ts — console in dev, silent in prod
│   │   ├── storage/              index.ts — namespaced, versioned; UI prefs ONLY
│   ├── stores/                   ui.store.ts, preferences.store.ts (global Zustand only)
│   ├── shared/                   Reusable, domain-agnostic building blocks
│   │   ├── components/
│   │   │   ├── ui/               Primitives, owned in-repo: button, input, textarea, combobox, checkbox, radio, switch, label, helper-text, segmented, alert, field-shell
│   │   │   ├── forms/
│   │   │   │   ├── fields/       TextField, TextareaField, ComboboxField, SwitchField, PriceField, PhoneField, UrlField
│   │   │   │   ├── translatable/ TranslatableTextField, TranslatableTextareaField, LocaleTabs
│   │   │   │   ├── media/        ImageField
│   │   │   │   └── layout/       Form, FormSection, FormActions, FieldGroup
│   │   │   ├── feedback/
│   │   │   │   ├── states/       EmptyState, ErrorState, LockedState, LoadingState
│   │   │   │   ├── dialogs/      ConfirmDialog, DestructiveConfirmDialog
│   │   │   │   ├── skeletons/    TableSkeleton, CardSkeleton, PageSkeleton
│   │   │   │   └── toasts/       toast.ts — the only sonner entry point
│   │   │   ├── data-display/
│   │   │   │   ├── table/        DataTable, DataTablePagination, DataTableToolbar, columns.ts
│   │   │   │   ├── stats/        StatCard, TrendBadge
│   │   │   │   ├── formatters/   Money, RelativeTime, DateTime
│   │   │   │   └── badges/       StatusBadge, LimitBadge
│   │   │   ├── layout/    (flat) PageHeader, Section, Container, SplitPane, Toolbar
│   │   │   └── navigation/
│   │   │       ├── sidebar/      Sidebar, SidebarGroup, SidebarItem
│   │   │       ├── topbar/       Topbar, UserMenu, PackagePill, LanguageSwitcher
│   │   │       └── breadcrumbs/  Breadcrumbs
│   │   ├── hooks/         (flat) use-debounce, use-media-query, use-direction, use-copy-to-clipboard, use-confirm
│   │   ├── utils/
│   │   │   ├── format/           money.ts, number.ts, date.ts
│   │   │   ├── string/           slug.ts, truncate.ts
│   │   │   ├── collection/       reorder.ts, group-by.ts
│   │   │   ├── url/              build-url.ts
│   │   │   └── dom/              cn.ts, focus.ts
│   │   ├── types/         (flat) api.ts (ApiEnvelope, ApiError, Paginated), money.ts, translatable.ts, ids.ts
│   │   └── constants/     (flat) features.ts, roles.ts, transaction-types.ts, platforms.ts, currencies.ts, locales.ts
│   ├── features/                 One folder per business capability — see §3
│   │   ├── auth/                 Session bootstrap, GET /user, logout. No pages: login lives on Laravel
│   │   │   ├── api/ schemas/ types/ hooks/ store/
│   │   │   └── components/ (flat) SessionProvider, SessionGate
│   │   ├── overview/             Home: /stats charts, limits usage, quick actions
│   │   │   └── components/       stats/ charts/ limits/ quick-actions/ range/
│   │   ├── menu/                 Menu builder (composite feature)
│   │   │   ├── categories/       api/ schemas/ types/ hooks/ store/ + components/ list/ form/ dialogs/
│   │   │   ├── dishes/           api/ schemas/ types/ hooks/ store/ + components/ list/ form/ dialogs/ availability/
│   │   │   ├── components/       builder/ dnd/ limits/
│   │   │   ├── hooks/            use-menu-builder.ts
│   │   │   └── pages/            MenuPage
│   │   ├── templates/            Store, select, settings editor
│   │   │   └── components/       store/ preview/ unlock/ settings/ settings/controls/
│   │   ├── packages/             Current package, the catalog, requesting one
│   │   │   └── components/       balance/ ledger/ packs/ checkout/ invoices/
│   │   ├── qr-studio/            QR design editor, preview, scan analytics
│   │   │   └── components/       editor/ editor/controls/ preview/ stats/ locked/
│   │   ├── social-links/         CRUD with per-platform validation
│   │   │   └── components/       list/ form/ platform/
│   │   ├── settings/             Restaurant profile, media, contact, localisation
│   │   │   └── components/       profile/ media/ contact/ localisation/
│   │   ├── account/              Owner profile, password
│   │   │   └── components/       profile/ password/
│   │   └── uploads/              Temp image upload → key. No pages, no store
│   │       └── components/       dropzone/ preview/
│   ├── locales/
│   │   ├── en/                   common, nav, auth, overview, menu, templates, packages, qr, social, settings, account, errors, validation
│   │   └── ar/                   same namespaces, Arabic
│   ├── styles/                   globals.css, tokens.css, rtl.css
│   ├── assets/
│   │   ├── images/               brand/ illustrations/
│   │   ├── icons/                platforms/
│   │   └── fonts/
│   └── test/
│       ├── setup/                vitest.setup.ts, i18n test instance
│       ├── mocks/handlers/       One MSW handler file per API resource
│       ├── mocks/factories/      Typed fake-data builders
│       └── utils/                renderWithProviders, query-client helpers
└── tests/e2e/
    ├── specs/                    Playwright journeys
    ├── fixtures/                 Auth state, seeded stubs
    └── page-objects/             Page object classes
```

---

## 3. Anatomy of a feature

Every `features/<name>/` has the same shape, so learning one teaches all:

```
features/packages/
├── api/          package.api.ts     — HTTP calls + response Zod schemas
├── schemas/      package.schema.ts  — response + form schemas shared with RHF
├── types/        package.types.ts   — z.infer'd types + view models
├── hooks/        package-keys.ts, use-packages.ts
├── store/        package.store.ts   — Zustand, transient UI state only
├── components/
│   ├── current/  CurrentPackageCard.tsx
│   ├── cards/    PackageCard.tsx
│   └── request/  RequestPackageDialog.tsx
├── pages/        PackagesPage.tsx   — route-level composition
└── index.ts      public barrel — the ONLY import path other features may use
```

Rules:

- **Components are grouped by area subfolder; adding a component is adding a
  file, never a folder.** No folder-per-component.
- `api/` functions return **parsed** data (`schema.parse(res.data)`), never raw
  axios payloads, so a backend contract change fails loudly in dev.
- Query keys come from the feature's key factory (`packageKeys.list()`).
  Never hand-write key arrays.
- Mutations invalidate by key prefix, and use optimistic updates with rollback
  where the UX needs it (menu reorder, availability toggle).
- Zustand stores use `create` + `devtools` + `immer`, and are read with
  selectors (`useMenuStore(s => s.selectedCategoryId)`) to avoid re-renders.
  Persist UI preferences only, never API data.

---

## 4. Routing

TanStack Router, file-based, with search params validated by Zod.

```
/                    overview
/menu                menu builder            guard: requireTemplate
/templates           template store
/templates/settings  template settings       guard: requireTemplate
/package             current package, the catalog, requesting one
/qr                  QR studio               guard: requireTemplate + qr_studio feature
/social-links        social links
/settings            restaurant settings     guard: requireTemplate
/account             owner account
```

Guard order in the authenticated layout: session loaded → user exists →
onboarding complete → (per route) template selected. Failing either of the
first two redirects to `VITE_LOGIN_URL`; the rest redirect inside the SPA.

---

## 5. Security

The backend already provides rate limiting, abuse bans, security headers and
Sanctum stateful auth. The SPA's responsibilities:

| Concern        | Approach                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Session        | Cookie only. **No tokens in localStorage/sessionStorage, ever.**                                                        |
| CSRF           | Interceptor primes `/api/csrf-token` once and retries once on 419.                                                      |
| XSS            | React escaping by default. Any `dangerouslySetInnerHTML` must go through `lib/security/sanitize.ts` (DOMPurify).        |
| Open redirects | `lib/security/safe-redirect.ts` allowlists the API origin and same-origin paths.                                        |
| Env            | `config/env.ts` parses `import.meta.env` with Zod at boot; bad config fails the build, not the user.                    |
| Input          | Every form has a Zod schema mirroring the API rules (lengths, price ≥ 0, allowed platforms).                            |
| Uploads        | Client checks MIME and size before POST; the server re-validates and optimises. Only the returned key is stored.        |
| Dependencies   | `npm audit` in CI, lockfile committed, `knip` flags unused packages.                                                    |
| Headers        | CSP / HSTS / frame-ancestors are set at the edge and documented in `docs/adr/`.                                         |
| Errors         | `lib/logger` only — console in dev, silent in prod. **No third-party telemetry.**                                       |
| Money          | Nothing is charged in the SPA. A package request is a message to the admin; the package itself is assigned server-side. |

---

## 6. Internationalisation

- `i18next` + `react-i18next`, one namespace per feature, lazily loaded from
  `src/locales/{en,ar}`.
- Language preference stored via `lib/storage` and mirrored onto `<html lang dir>`.
- Tailwind logical utilities (`ms-`, `pe-`, `text-start`) instead of physical
  ones, so RTL needs no overrides.
- Money via `Intl.NumberFormat` with the restaurant's currency; dates via
  `date-fns` with the `ar`/`en` locale.
- Translatable API fields arrive as `{en, ar}` objects; edit them with
  `TranslatableTextField`.

---

## 7. Testing

| Layer                         | Tool                                            | Where                     |
| ----------------------------- | ----------------------------------------------- | ------------------------- |
| Unit (utils, schemas, stores) | Vitest                                          | co-located `*.test.ts`    |
| Component / hook              | Vitest + Testing Library + MSW                  | co-located `*.test.tsx`   |
| API contract                  | MSW handlers typed against the same Zod schemas | `src/test/mocks/handlers` |
| End-to-end                    | Playwright against a seeded Laravel instance    | `tests/e2e`               |

CI gate: `typecheck && lint && test && build`. E2E runs on the main branch and
on PRs labelled `e2e`.

---

## 8. Packages

### Runtime

| Package                                                                                | Purpose                                               |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `react`, `react-dom` (19)                                                              | Already installed                                     |
| `@tanstack/react-router`                                                               | Type-safe file-based routing, search-param validation |
| `@tanstack/react-query`                                                                | Server state, caching, optimistic updates             |
| `@tanstack/react-table`                                                                | Headless tables (ledger, dishes)                      |
| `zustand`, `immer`                                                                     | Client/UI state with immutable updates                |
| `axios`                                                                                | HTTP (already installed)                              |
| `zod` (v4)                                                                             | Validation for env, API responses, forms              |
| `react-hook-form`, `@hookform/resolvers`                                               | Forms bound to Zod schemas                            |
| `i18next`, `react-i18next`, `i18next-browser-languagedetector`, `i18next-http-backend` | Bilingual EN/AR, lazy namespaces                      |
| `tailwindcss`, `@tailwindcss/vite` (v4)                                                | Styling with logical properties for RTL               |
| `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`       | shadcn/ui primitives owned in-repo                    |
| `sonner`                                                                               | Toasts                                                |
| `react-error-boundary`                                                                 | Error boundaries per route and feature                |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`                             | Reordering categories and dishes                      |
| `react-dropzone`                                                                       | Image dropzone                                        |
| `recharts`                                                                             | Overview charts                                       |
| `qr-code-styling`                                                                      | Live QR preview                                       |
| `date-fns`                                                                             | Dates with locales                                    |
| `dompurify`                                                                            | HTML sanitisation                                     |

### Dev / tooling

| Package                                                                              | Purpose                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------ |
| `typescript`, `vite`, `@vitejs/plugin-react`, `oxlint`                               | Already installed                          |
| `@tanstack/router-plugin`                                                            | Route tree generation                      |
| `vite-tsconfig-paths`                                                                | `@/` import alias                          |
| `prettier`, `prettier-plugin-tailwindcss`                                            | Formatting, class sorting                  |
| `husky`, `lint-staged`                                                               | Pre-commit lint/format, pre-push typecheck |
| `vitest`, `@vitest/coverage-v8`, `jsdom`                                             | Unit and component tests                   |
| `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Component testing                          |
| `msw`                                                                                | API mocking                                |
| `@playwright/test`                                                                   | End-to-end                                 |
| `@tanstack/react-query-devtools`, `@tanstack/router-devtools`                        | Dev-only inspectors                        |
| `@types/dompurify`                                                                   | Types                                      |
| `knip`                                                                               | Unused files, exports and dependencies     |

### Install commands

```bash
# runtime
npm i @tanstack/react-router @tanstack/react-query @tanstack/react-table \
  zustand immer zod react-hook-form @hookform/resolvers \
  i18next react-i18next i18next-browser-languagedetector i18next-http-backend \
  tailwindcss @tailwindcss/vite radix-ui class-variance-authority clsx tailwind-merge lucide-react \
  sonner react-error-boundary @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  react-dropzone recharts qr-code-styling date-fns dompurify

# dev
npm i -D @tanstack/router-plugin @tanstack/react-query-devtools @tanstack/router-devtools \
  vite-tsconfig-paths prettier prettier-plugin-tailwindcss husky lint-staged \
  vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom msw @playwright/test @types/dompurify knip

# shadcn components are generated into src/shared/components/ui
npx shadcn@latest init
```

---

## 9. Conventions

- **Files:** `kebab-case.ts` for modules, `PascalCase.tsx` for components,
  `use-*.ts` for hooks, `*.schema.ts`, `*.api.ts`, `*.store.ts`, and
  `*.test.ts(x)` co-located with what it tests.
- **Exports:** named only; each feature exposes an `index.ts` barrel.
- **Imports:** absolute via `@/` (`@/features/menu`, `@/shared/components/ui/button`).
- **Components:** function components, props typed as `type Props`, no default
  exports, no prop spreading onto DOM outside `ui/` primitives.
- **Async:** every mutation surfaces success and failure through the toast
  helper; every query has a skeleton and an `ErrorState` with retry.
- **Commits:** Conventional Commits, written by the user. Agents never commit.
- **ADRs:** anything hard to reverse (router, state library, UI kit, CSP
  strategy) gets a short file in `docs/adr/`.

---

## 10. Roadmap

| Phase    | Deliverable                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------- |
| 0 (done) | Full-depth folder structure, CLAUDE.md, this document                                                    |
| 1        | Packages, Tailwind, `@/` alias, Prettier, Husky, Vitest, MSW, CI workflow                                |
| 2        | `config/env.ts`, `lib/api` with CSRF interceptor, `lib/query`, `lib/i18n`, `lib/security`, global stores |
| 3        | Migrate auth into `features/auth`; router, guards, app shell with sidebar and topbar                     |
| 4        | Templates: store, select, settings editor. Dashboard unlocks here                                        |
| 5        | Uploads + menu builder: categories and dishes with drag-and-drop, limits                                 |
| 6        | Settings, social links, account                                                                          |
| 7        | Packages: the catalog, the current package, requesting one; overview stats and charts                    |
| 8        | QR Studio                                                                                                |
| 9        | Playwright journeys, code splitting, a11y and RTL pass, `knip` in CI                                     |

### Migration of the current files (phase 3)

| Today                          | Destination                                            |
| ------------------------------ | ------------------------------------------------------ |
| `src/lib/api.ts`               | `src/lib/api/client.ts` + `interceptors/csrf.ts`       |
| `src/auth/auth-context.ts`     | `src/features/auth/types` + `hooks/use-session.ts`     |
| `src/auth/AuthProvider.tsx`    | `src/features/auth/components/SessionProvider.tsx`     |
| `src/auth/AuthGuard.tsx`       | `src/app/guards/require-auth.ts` (router `beforeLoad`) |
| `src/App.tsx`                  | Replaced by `src/app/providers` + the router           |
| `src/App.css`, `src/index.css` | `src/styles/globals.css`                               |
