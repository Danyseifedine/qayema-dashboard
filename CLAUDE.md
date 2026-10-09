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
  i18next (en/ar, RTL), axios, dnd-kit, recharts, qr-code-styling. Every
  icon is Tabler (`@tabler/icons-react`, `IconX` components, `TablerIcon` for
  a prop that takes one), the social platforms' brand marks included
  (`platform-icon.tsx`); no other icon set.
  Tests: Vitest + Testing Library + axios-mock-adapter; end-to-end Playwright +
  axe (`e2e/`, see ARCHITECTURE §7). Lint: oxlint. Format:
  Prettier. Hooks: Husky + lint-staged. No router library: the open page is its
  nav key in the URL (`/categories`), via `usePageKey`.

No third-party error telemetry.

## Architecture (full detail in docs/ARCHITECTURE.md)

- **One name per thing.** Sidebar label = page heading = feature folder =
  nav key = i18n namespace = query root: `overview`, `analytics`, `menu`
  (categories, dishes), `design`, `orders` (+ its `table-orders` page),
  `tables`, `qr`, `social-links`,
  `restaurant` (+ its `features` page), `package`, `account`. The sidebar
  goes by how often a page is opened: Overview and Analytics, then ORDERS
  (Orders, Table orders), MENU (Categories, Dishes), LOOK (Design,
  Appearance), SHARING (QR code, Tables, Social links), SETTINGS
  (Restaurant, Features, Package); Account opens from the avatar menu.
  The vocabulary table is §2 of docs/ARCHITECTURE.md; the backend's CLAUDE.md
  carries the same names.
- Three words never swapped: **plan** = what the restaurant may use
  (`restaurant.plan`, one boolean per backend `Feature` flag:
  `multiple_languages`, `variants`, `addons`, `appearance`, `premium_designs`,
  `qr_studio`, `ordering`, `menu_ordering`, `dine_in`, `analytics`, `advanced_analytics`; `requiresPlan`
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
  (`common`, `overview`, `analytics`, `menu`, `design`, `appearance`, `orders`, `tables`,
  `qr`, `social-links`, `restaurant`, `features`, `package`, `account`).
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
  **package** lacks is left out of the sidebar (`isOnPlan`); opened by a
  link it shows `PlanLockedPage` (what it gives, the package that has it,
  "See packages"). One waiting for a **design** is disabled. Anything locked inside a page uses `LockedState`
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
  keeps the QR code page with the plain code (`qr.switched_off`). Above the
  switches, "Menu language" picks the main language for every package
  (`MainLanguageSection`): the second one swaps at once, a new one asks
  first (`ConfirmDialog`), and `GET /api/menu-languages`'s `missing` says how
  many categories and dishes still lack a name in it, with the way to
  Dishes. Multiple languages carries its own pickers (second language, never
  the main one; opening language) saved with `PUT /api/menu-languages`; the Restaurant page's text fields just
  follow `useMenuLanguages()` (from `features/auth`, it reads the session).
  Orders carries how guests send them (`OrderingChoice`): "On WhatsApp" or
  "In your menu" (locked without `plan.menu_ordering`), and in the menu one
  switch each for Delivery and Pickup, the last one on staying on;
  `PUT /api/features/ordering`, optimistic into
  `restaurant.ordering` (`useSaveOrdering`). **Ordering at the table** is a
  row of its own (switch `dine_in`, flag `plan.dine_in`), independent of
  Orders, with its own way in (`DineInChoice`): "Dashboard" (the Table
  orders page) or "WhatsApp" (the table's name heads the message),
  `PUT /api/features/dine-in`, optimistic into `restaurant.ordering.dine_in`
  (`useSaveDineIn`). WhatsApp needs the restaurant's number
  (`ordering.whatsapp_number`): without one it is disabled with the way to
  the Restaurant page, and a choice made before says orders arrive here
  until one is added. `useTableOrderingMode()` (from `features/auth`) is the
  server's `dineInChannel()`. It hides both Tables and Table orders
  (`switchKey: 'dine_in'` on their nav items; `isNavItemHidden` reads
  `switchKey ?? key`).
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
- An order is written by the guest who placed it. The dashboard moves its
  `status`, and may also **edit** what it holds (`EditOrderDialog`,
  `PUT /api/orders/{id}/items`: quantities, a line off, dishes added with
  their choices; kept lines keep the price they were sold at, added ones are
  priced by the server, dishes hidden from guests included; saving a new
  order accepts it; not for a cancelled one) or **delete** it for good
  (`DeleteOrderDialog`, `DELETE /api/orders/{id}`: its lines, its place in
  the analytics, and the guest's tracking go). A line's `options` (the
  guest's variants and add-ons, as named then) show under the dish on its
  card; "Changed by you at …" shows after an edit.
- **Orders come one way at a time** (`useOrderingMode()` from `features/auth`:
  `whatsapp`, `menu`, or null without ordering). On WhatsApp the Orders page
  says the orders are handled there (we never learn if one was sent) and
  lists only orders placed in the menu before a switch. In the menu, each
  card shows the guest's name, Delivery/Pickup/At the table (with the table's
  name as a badge by the reference), their phone (call and WhatsApp links),
  the address and a map link. One button moves it on (`nextStep()` in the
  card): **Accept** (`accepted`, which the guest sees on their tracking page),
  then **On its way** (delivery) or **Ready** (pickup), both `ready`, then
  **Done**. At a table it is shorter: **Start preparing** (`accepted`, read
  "Preparing"), then **Served** (`done`). A guest may change an order (or add dishes to it) only until it
  is accepted: the card then says "Changed by the guest at …" (amber while
  it waits to be accepted), and the pulse's
  `changed` chimes like a new order. Taking on a new order sends the card's
  `guest_updates`; the server refuses (409) a version the owner has not
  seen and any step back, and the hook refreshes the lists on a 409. Pusher
  counts as heard only once the private channel is joined (`.subscribed`);
  a refused sign-in (`.error`) brings the minute's check back, and a pushed
  pulse is parsed with `orderPulseSchema` like any answer. The
  New chip and the waiting count are only orders not yet accepted.
  `useOrderPulse` (mounted in `App`, on only in menu mode) listens on Pusher
  (`private-orders.{restaurant.id}`, event `orders.changed`, via
  `lib/realtime/echo.ts`; `VITE_PUSHER_KEY` / `VITE_PUSHER_CLUSTER`, the
  private channel signed at `POST /api/broadcasting/auth`) and asks
  `/api/orders/pulse` only once a minute while Pusher cannot be heard, in a
  background tab too:
  a new order plays `public/new_order_alert.mp3`, toasts and refreshes the
  list; the number waiting is the sidebar badge (`counts`) and the tab title
  "(2) …". Analytics label the orders tile and the funnel's last step from
  `order_channel` ("Sent to WhatsApp" vs "Orders").
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
- **Table orders** (`table-orders` page inside `features/orders`,
  `GET /api/orders?kind=table`): orders to a table, grouped by table, the
  one waiting longest first, with the same cards and actions as Orders
  (`useOrderActions`, `CancelOrderDialog`). The Orders page asks
  `kind=away`. While table orders go to WhatsApp the page says so, as the
  Orders page does, and still lists those placed here before. The pulse
  runs while orders or table orders are taken in the menu, and returns
  `{orders, tables}`: one sidebar count each, both in the tab title.
- **Tables** (`features/tables`, `/api/tables`, needs `plan.dine_in`):
  each table has a name and a random `code`; its QR code opens the menu at
  `?table=<code>&qr=1`, and an order "at my table" (`dine_in`) goes to it.
  Codes are drawn with the QR page's design (`useQr`, `qrOptions` from the
  qr barrel). Add a numbered run or one by name, rename (the code stays),
  give a new code (the printed card stops working), remove (orders keep the
  table's name). Print uses a portal sheet (`components/print/print-sheet.tsx`)
  that `globals.css` shows only on paper. `meta.takes_orders` is false while
  ordering at the table is switched off, with a way to Features.
- The QR preview mirrors the printable card: `features/qr/utils/qr-options.ts`
  is the twin of `QrStyle::options()` in `../qayema`, tested against the same
  cases. Change one, change both. `qr-code-styling` needs a real canvas, so
  tests mock it and assert the options it was given, not the pixels.
- **Two kinds of language.** `shared/constants/locales.ts` is the dashboard's
  own interface (en/ar). `shared/constants/menu-languages.ts` is what a
  restaurant's _menu_ can be written in: a main language the owner picks
  (any on the list, `restaurant.main_locale`) plus one optional second
  language, per restaurant, read with `useMenuLanguages()` (`features/auth`),
  the main one first (`mainLanguageOf()`).
  Menu text is `Record<code, string|null>` (`menuTextSchema`); platform
  content (package, design names) is `{en, ar}` (`translatableTextSchema`),
  both in `shared/utils/string/menu-text.ts`; forms build menu text
  with `toMenuTextForm()` and require the main language with
  `requireMainLanguage()` (the form text's first entry; the message names
  it). `TranslatableTextField` takes `languages` and shows no tabs for a
  one-language menu. Send every active language (blank clears it); never send
  a hidden one (the server keeps it for when the owner switches back).
- **Menu link** (`features/restaurant/components/identity/link-section.tsx`):
  the slug, changed on its own (not with the page's save), after a
  `ConfirmDialog` saying the old link and printed QR codes keep forwarding;
  `useChangeSlug` (`PUT /api/restaurant/slug`) refreshes the session and the
  QR page. The server writes the link cleanly ("My Place" → my-place).
- **Opening hours** (`features/restaurant/components/hours/`): each day is
  its name and switch, then an Opens and a Closes line. A time is picked the
  way a clock reads (`TimePicker`): the hour (1 to 12), the minutes (00, 15,
  30, 45; a saved 07:20 keeps its 20) and AM | PM, with its part of the day
  beside it (Morning 05:00, Afternoon 12:00, Evening 17:00, Night 21:00),
  and stored as "HH:MM" as before (`splitTime` / `joinTime` in
  `time-options.ts`). A day whose close comes before its open says it runs
  past midnight. The shared `Combobox` has a `size="sm"` for small pickers on
  one line, opens on the current choice, and grows to fit its options (up to
  320px) toward the side with room.
- Card text on the QR form is `''` in the form and `null` on the wire;
  `toFormValues` / `toDesign` convert, so blank text never saves as `""`.
- **Overview** (`features/overview`): the menu's link first
  (`components/link/menu-link-card.tsx`: copy, open, QR code), then setting
  it up in three steps (`components/checklist/setup-stepper.tsx`: your
  restaurant, your dishes, sharing it; built from `menuChecklist()` and
  `setupSteps()`, pure and unit tested; the first step not done is open)
  beside "How it works" (`components/guide/how-it-works.tsx`, hidden on the
  owner's request and remembered in `ui.store`), then the dish, category and
  social-link counts from the session's `limits`. Each item's action is a nav
  key.
- **Analytics** (`features/analytics`): the page needs `plan.analytics` (the
  nav locks it otherwise, with `AnalyticsTeaser`: this week's views from
  `GET /api/analytics/teaser`); `GET /api/analytics/advanced` only when
  `restaurant.plan.advanced_analytics` is on (the hook is disabled otherwise,
  never fired and caught). Charts are recharts with `responsive`; colours are
  theme tokens (`components/charts/chart-style.ts`), date helpers are
  `shared/utils/format/date.ts`, and every count goes through `formatNumber`
  (`format/number.ts`: the reader's language, Western digits). jsdom has no ResizeObserver, so the test
  setup stubs it and chart tests read the words around a chart, not its bars.

## Speed

- Every page but Orders is `lazy()` in `App.tsx` (`PAGES`), so the first
  download is the shell; the rest load on idle (`usePrefetchPages`) and a
  page still on its way shows `PageSkeleton`. Pusher's library loads only
  in menu mode (`realtime()` imports it). Keep heavy libraries (recharts,
  qr-code-styling, dnd-kit) inside their feature, never in `shared` or the
  shell, or they come back into the first download.
- A library only a lazy page uses goes in `optimizeDeps.include`
  (`vite.config.ts`): otherwise the dev server bundles it at that page's
  first visit and reloads the page mid-load, which times out e2e tests.
- A tab from before a release asks for files that are gone:
  `app/new-release.ts` reloads it once (`vite:preloadError`).
- `public/.htaccess` ships with the build: `index.html` is `no-cache`,
  hashed files are kept a year, and a missing `assets/` file is a 404 (not
  the page). Fonts load without blocking the first paint.

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
