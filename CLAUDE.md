# Qayema Dashboard: Working Rules

## Non-negotiable rules

1. **Never commit.** Never run `git commit`, `git push`, `git add`, `git stash`,
   `git reset`, or any command that changes git state. The user does every
   commit. If a step would normally end with a commit, stop and say the tree is
   ready to commit.
2. **Never leave a component unused.** Every component, hook, store, schema or
   util you create must be imported and used in the same task. If a task ends
   and something is unused, delete it or wire it in; never leave it.
3. **Always use the component.** Before writing markup, look in
   `src/shared/components/` and the feature's `components/`. If a component
   exists for the job, use it. Never re-implement a button, dialog, field,
   table, empty state or skeleton with raw JSX. If the existing component does
   not fit, extend it; do not fork it.
4. **Always tell the truth.** Report what actually happened: if a build failed,
   a test was skipped, a step was not done, or you are guessing, say it
   plainly in the first sentence. No softening, no reassurance, no claiming
   something works without having run it. The user does not need feelings
   managed; they need accurate status.
5. **Never use em dashes.** Not in code, comments, UI copy, translations
   (English or Arabic), tests, docs or messages. Write a comma, colon,
   semicolon, parentheses or a new sentence instead (in Arabic, the Arabic comma ، or a colon);
   never an en dash or `--` in its place. An empty-value placeholder is `-`.
6. **Never run a full suite unless the user says to.** Not `npm run check`,
   `npm run test`, `npm run test:coverage` or `npm run e2e`, and not
   `composer check` in ../qayema. Check your work with targeted runs only:
   the test files you touched (`npx vitest run <path>`), or one Playwright
   spec on one project (`--project=desktop`). When you are done, say which
   full suites have not been run and leave the decision to the user.

## Stack

React 19, Vite, TypeScript (strict), TanStack Query, Zustand, React Hook Form

- Zod v4, Tailwind v4 with our own primitives in `shared/components/ui`,
  i18next (en/ar, RTL), axios, dnd-kit, recharts, qr-code-styling.
  Tests: Vitest + Testing Library + axios-mock-adapter; end-to-end Playwright +
  axe (`e2e/`, see ARCHITECTURE §7). Lint: oxlint. Format:
  Prettier. Hooks: Husky + lint-staged. No router library: the open page is its
  nav key in the URL (`/categories`), via `usePageKey`.

No third-party error telemetry.

## Architecture (full detail in docs/ARCHITECTURE.md)

- **One name per thing.** Sidebar label = page heading = feature folder =
  nav key = i18n namespace = query root: `overview`, `analytics`, `menu`
  (categories, dishes), `design`, `orders`, `qr`, `social-links`,
  `restaurant` (+ its `features` page), `package`, `account`. The sidebar
  groups them as MENU / GUESTS / SETTINGS; Account opens from the avatar menu.
  The vocabulary table is §2 of docs/ARCHITECTURE.md; the backend's CLAUDE.md
  carries the same names.
- Three words never swapped: **plan** = what the restaurant may use
  (`restaurant.plan`, one boolean per backend `Feature` flag:
  `multiple_languages`, `variants`, `addons`, `appearance`, `premium_designs`,
  `qr_studio`, `ordering`, `analytics`, `advanced_analytics`; `requiresPlan`
  in nav-items); **switched off** = what the owner turned off on the Features
  page (`restaurant.switched_off`, `hideable` in nav-items); **grant** is a
  backend word (an admin giving one restaurant more than its package).
- Feature-first: `src/features/<name>/{api,schemas,hooks,components/<area>,pages}`
  plus an `index.ts` barrel that exports only what outsiders import.
- Import direction: `app → features → shared → lib → config`. Cross-feature
  imports only through the other feature's `index.ts`; `shared` never imports
  from `features` or `app`. Always `@/…`, never relative.
- State ownership: server data → TanStack Query; UI preferences → Zustand;
  form state → RHF + Zod; the open page → the URL (`usePageKey`). Never mix.
- Every API call parses its response with a Zod schema. Every form has a Zod
  schema. `config/env.ts` validates `import.meta.env` at boot.
- Session is the Sanctum cookie. No tokens in localStorage/sessionStorage.
  CSRF primed from `GET /api/csrf-token` (body token → `X-CSRF-TOKEN`).
- Every user-visible string goes through i18n (`src/lib/i18n`, i18next). Use
  logical Tailwind utilities (`ms-`, `pe-`, `text-start`) so RTL needs no
  overrides.
- **Translations:** `src/locales/<code>/` holds `meta.json` (name, short
  label, `ltr`/`rtl`) and one JSON per namespace, named after the feature
  (`common`, `overview`, `analytics`, `menu`, `design`, `appearance`, `orders`, `qr`,
  `social-links`, `restaurant`, `features`, `package`, `account`).
  **To add a language, copy `src/locales/en/` to `src/locales/<code>/` and
  translate it**: it is found at build time and appears in the switcher;
  nothing else changes. `translations.test.ts` fails on any missing line or
  plural form (Arabic needs zero/one/two/few/many/other). A new _area_ file is
  also registered once in `src/lib/i18n/resources.ts`, which types the keys.
- In components `useTranslation('<area>')`; outside React (toasts in hooks, zod
  messages) `import { t } from '@/lib/i18n'` and call it when the text is
  needed, never at module load, which freezes English. Zod: `{ error: () =>
t('…') }`. Counts use plurals (`t('key', { count })`), sentences with markup
  use `<Trans>`. Tests run in English (set in the vitest setup).
- The dashboard sends `Accept-Language`; the API answers in it when it has that
  language (`lang/ar.json`, `lang/ar/validation.php` in ../qayema), English
  otherwise.
- **The tree in docs/ARCHITECTURE.md §2 is the tree.** Add files freely into
  the folder that fits. A new, renamed or removed folder is a design decision:
  ask, and update §2 in the same change. No `.gitkeep` placeholders.

## Conventions

- Files: `kebab-case.ts(x)` for everything, components included; hooks
  `use-*.ts`, keys `*-keys.ts`, `*.schema.ts`, `*.api.ts`, `*.store.ts`,
  `*.test.ts(x)` co-located. Identifiers use `color`; English copy "colour".
- Named exports only. `@/` alias for all imports.
- Query keys come from the feature's key factory; never hand-written arrays.
- Toasts live in the mutation hook, not the call site, so every caller gets
  them. A mutation that writes and waits toasts on success and on error. An
  **optimistic** mutation (reorder, availability) toasts on **error only**: the
  UI already moved, so a success toast is noise, while an error toast explains
  why it snapped back.
- Every query has a skeleton and an `ErrorState` with retry.
- Backend contract: `../qayema/routes/api.php` and
  `../qayema/app/Http/Resources/*`. Errors are `{message, code}`; a rate limit
  is **429** carrying `retry_after`.
- Limits come from the restaurant's **package**, and a `limit` of `null` means
  unlimited; never render it as a number. Nothing is bought in the SPA:
  `POST /api/packages/request` sends a message and an admin assigns the
  package.
- Section gating is data-driven: `requiresPlan` on a nav item is matched
  against `restaurant.plan` by key. Adding a gated section is one line in
  `app/layouts/authenticated/nav-items.ts`, not another branch in `navLock`
  (plus its copy under `planLocked.<key>` in `common.json`). A section the
  **package** lacks stays open and shows `PlanLockedPage` (what it gives, the
  package that has it, "See packages"); one waiting for a **design** is
  disabled. Anything locked inside a page uses `LockedState`
  (`shared/components/feedback`) and names its package with
  `usePackageFor(flag, locale)` from the package barrel, never a hard-coded
  "Pro".
- **Package page** (`features/package`): the current package with its dates
  from the session (`package.{ends_at, days_left}`, `lapsed`,
  `upcoming`), shown as "Until …, N days left", a warning with "Ask to
  extend" in the last 7 days (the topbar pill shows a dot then too), "Your Pro
  ended on …" with "Ask to renew", or "Premium starts on …"; the limits used;
  and what the package includes. Then one card per package ("Everything in Free, plus:",
  built by `highlightsOf()`, only when it really has everything the one before
  has) and the comparison table. Cards and table both read
  `utils/package-rows.ts`, the one list of features, groups and order. Tests
  use `PACKAGE_CATALOGUE` / `makePackage()` (`test/factories/packages`)
  and `FULL_PLAN` / `EMPTY_PLAN` (`…/session`).
- **Features page** (`features/restaurant/pages/features-page.tsx`): one switch
  each for Orders, Variants, Add-ons, QR Studio, Analytics and Multiple
  languages, stored in
  `restaurant.switched_off` (`PUT /api/features` with `{off}`, optimistic
  through the session cache; must match `Restaurant::OPTIONAL_FEATURES`). A nav
  item with `hideable: true` (analytics, orders) leaves the sidebar when off
  (`isNavItemHidden`), and an open page hands over to Overview. QR Studio off
  keeps the QR code page with the plain code (`qr.switched_off`). Multiple
  languages carries its own pickers (second language, opening language) saved
  with `PUT /api/menu-languages`; the Restaurant page's text fields just
  follow `useMenuLanguages()` (from `features/auth`, it reads the session).
- **Design page** (`features/design`): picking a design (backend `Template`
  rows, `/api/templates`). Switching invalidates Appearance and the QR
  studio, since both follow the design. A design with `is_premium` shows a
  "Premium" chip; when `locked` its button opens the Package page. When
  `meta.shown` differs from `meta.current`, the chosen design needs a package
  the restaurant lost, and a notice says which design the menu shows meanwhile.
- **Appearance** (`features/appearance`, `GET/PUT /api/appearance`): the
  design's settings are whatever the design in use declares; never name one
  in code. `DesignSettingsCard` draws each by its type (colour → `ColorField`
  with a reset, boolean → `SwitchField`, select → `ChoiceField`, text →
  `TextField`), labelled from the schema, with a zod schema built from the
  rows. Each design remembers its own. Save sends only changed settings, and
  `null` when one is back on its default. A `contrast_with` colour pair warns
  below 4.5:1 (`shared/utils/color/contrast.ts`). Fonts: one picker per
  writing system the menu uses (English + Spanish = one), options and a
  sample line from the API, saved on tap (optimistic). The Features page and
  the menu-languages save invalidate it.
- An order is written once by the guest who placed it. The dashboard may change
  its `status` and nothing else. A line's `options` (the guest's variants and
  add-ons, as named then) show under the dish on its card.
- **Variants and add-ons** (`features/menu/dishes/components/options/`,
  `schemas/dish-choices.schema.ts`): a section of the dish form, shown per
  list while `useDishChoices()` (from `features/auth`: package flag and not
  switched off) says it is on. Variants (Size: Small / Large) and add-ons
  (Extra cheese), each row a name and what it adds to the price; one set of
  `LocaleTabs` switches every name's language; rows drag into order
  (`SortableList` takes field-array keys); ready-made Size / Spice level /
  Quantity; "Copy from another dish" copies as new rows. Rows keep the saved
  id as `savedId` (RHF field arrays own `id`) and send it back as `id`. A
  list that is off is left out of the form and of the save, so the server
  keeps it. Limits mirror `../qayema/config/menu.php`.
- The QR preview mirrors the printable card: `features/qr/utils/qr-options.ts`
  is the twin of `QrStyle::options()` in `../qayema`, tested against the same
  cases. Change one, change both. `qr-code-styling` needs a real canvas, so
  tests mock it and assert the options it was given, not the pixels.
- **Two kinds of language.** `shared/constants/locales.ts` is the dashboard's
  own interface (en/ar). `shared/constants/menu-languages.ts` is what a
  restaurant's _menu_ can be written in: English plus one optional second
  language, per restaurant, read with `useMenuLanguages()` (`features/auth`).
  Menu text is `Record<code, string|null>` (`menuTextSchema`); platform
  content (package, design names) is `{en, ar}` (`translatableTextSchema`),
  both in `shared/utils/string/menu-text.ts`; forms build menu text
  with `toMenuTextForm()` and require English with `requireEnglish()`.
  `TranslatableTextField` takes `languages` and shows no tabs for an
  English-only menu. Send every active language (blank clears it); never send
  a hidden one (the server keeps it for when the owner switches back).
- Card text on the QR form is `''` in the form and `null` on the wire;
  `toFormValues` / `toDesign` convert, so blank text never saves as `""`.
- **Overview** (`features/overview`) is the menu at a glance: dish, category
  and social-link counts from the session's `limits`, and a "Finish your menu"
  checklist built from the restaurant + dishes by `menuChecklist()` (a pure
  function, unit tested). Each item's action is a nav key.
- **Analytics** (`features/analytics`): the page needs `plan.analytics` (the
  nav locks it otherwise, with `AnalyticsTeaser`: this week's views from
  `GET /api/analytics/teaser`); `GET /api/analytics/advanced` only when
  `restaurant.plan.advanced_analytics` is on (the hook is disabled otherwise,
  never fired and caught). Charts are recharts with `responsive`; colours are
  theme tokens (`components/charts/chart-style.ts`), date helpers are
  `shared/utils/format/date.ts`, and every count goes through `formatNumber`
  (`format/number.ts`: the reader's language, Western digits). jsdom has no ResizeObserver, so the test
  setup stubs it and chart tests read the words around a chart, not its bars.

## Commands

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` ·
`npm run test` · `npm run test:coverage` · `npm run format` ·
`npm run format:check` · `npm run e2e` · `npm run e2e:update-snapshots`

A change is done when `typecheck`, `lint`, `format:check`, `test:coverage`,
`build` and `e2e` are all green; the full runs happen only when the user asks
for them (rule 6). E2E rules: each test builds its own owner
through the `owner()` fixture and never changes shared data; no retries, no
fixed sleeps; tag the main flow of an area `@matrix` so it also runs on a
phone, in Arabic RTL and in dark mode. Specs go in `e2e/specs/<surface>/`
(`dashboard`, `public`, `admin`, `quality`); a helper two specs use goes in
`e2e/support/helpers.ts`. Generated output only ever lands in
`.test-output/`.
