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

No third-party error telemetry. Our own instead: a page that throws shows
"Something on this page went wrong" (`ErrorBoundary`, one per page in
`App.tsx`, keyed by the page, and one around the app in `main.tsx`), and
that, script errors and uncaught promises go to the backend's log
(`lib/api/report-error.ts`, `POST /api/client-errors`; plain `fetch`, no
cookies, five a page load at most), and from there to Grafana.

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
  plus an `index.ts` barrel that exports only what outsiders import, never a
  page: pages are exported by `pages/index.ts`, which only `App.tsx` imports
  (`App.pages.test.ts`).
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
- **A slow or patchy connection is not an error at once.** A read that
  never reached the server is tried for about 15 s (`NETWORK_RETRIES`, 1,
  2, 4, 8 s apart; a 5xx twice) before its `ErrorState`, and paused while
  the phone says it is offline; the session gate says "Your connection is
  slow. Still trying…" meanwhile. A PUT, PATCH or DELETE that got no answer
  is sent again after 1 and 2 s (`RESEND_AFTER` in `lib/api/request.ts`); a
  POST never, so nothing is created twice. A request the app called off
  (axios cancel) is handed back as it came, never as "We could not connect".
- **Images are shrunk before they upload.** `uploadTempImage` sends what
  `shrinkImage` (`features/uploads/utils/shrink-image.ts`) returns: longest
  side at most 2048 px, WebP 0.85 (JPEG on Safari, which cannot encode WebP,
  only for a JPEG source), the original whenever that is not smaller or
  anything fails. Every new upload path goes through `uploadTempImage`; the
  input guard still checks the original.
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
  extend" in the last 7 days; the topbar pill is a crown with no text in the
  package's metal (bronze Free, silver Pro, gold Premium and Custom,
  `tierOf()`) with the days left in a round badge on its corner, edged in
  the same metal (`package.days_left`, 99+ past 99, amber in the last 7). "Your Pro
  ended on …" with when the menu goes offline and "Ask to renew", or
  "Premium starts on …"; the limits used; and what the package includes.
  An ended package is kept, never swapped for Free: for a few days
  (`lapsed.offline_at`) the menu stays online and every page but Package
  carries a warning (`MenuGoingOffline`); once `lapsed.offline`, every page
  but Package and Account (`OPEN_WHILE_OFFLINE` in nav-items) is the renew
  screen (`MenuOfflinePage`, `app/layouts/authenticated/menu-offline.tsx`).
  Then one card per package ("Everything in Free, plus:",
  built by `highlightsOf()`, only when it really has everything the one before
  has) and the comparison table. Cards and table both read
  `utils/package-rows.ts`, the one list of features, groups and order. Tests
  use `PACKAGE_CATALOGUE` / `makePackage()` (`test/factories/packages`)
  and `FULL_PLAN` / `EMPTY_PLAN` (`…/session`).
- **Features page** (`features/restaurant/pages/features-page.tsx`): related
  features grouped in sections (`GROUPS`, in the sidebar's order): Orders
  (Orders, Ordering at the table), Dishes (Variants, Add-ons), Menu languages
  (the main language, then Multiple languages) and QR code and analytics (QR
  Studio, Analytics). Each feature is a switch (`FeatureRow`), stored in
  `restaurant.switched_off` (`PUT /api/features` with `{off}`, optimistic
  through the session cache; must match `Restaurant::OPTIONAL_FEATURES`). A nav
  item with `hideable: true` (analytics, orders) leaves the sidebar when off
  (`isNavItemHidden`), and an open page hands over to Overview. QR Studio off
  keeps the QR code page with the plain code (`qr.switched_off`). At the top
  of Menu languages, "Your menu is written in" picks the main language for
  every package (`MainLanguageField`): the second one swaps at once, a new one asks
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
  (`useSaveDineIn`). On WhatsApp, "Ask guests for" (`AskGuestsFor`) sets
  Name, Phone and Delivery address (Off | Optional | Required) for delivery
  and pickup, and Name and Phone for table orders on WhatsApp
  (`ordering.whatsapp_fields.{away,table}`, saved whole with
  `PUT /api/features/whatsapp-fields`, optimistic, `useSaveWhatsAppFields`);
  once the address is asked, the Delivery/Pickup switches show on WhatsApp
  too, since the guest then picks one. WhatsApp needs the restaurant's number
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
- **Writing help (AI)**: while `restaurant.writing_help` is on (the server
  has an AI provider set up and the package gives uses a day,
  `writing_help_limit`, a limit row on the Package page), `WritingHelpProvider` (around
  the pages in `App.tsx`) lets every `TranslatableTextField` show
  `WritingHelpButtons` under its control: "Translate", either way: "to
  <other>" puts the open tab's text into the other language and opens it;
  on an empty tab "from <other>" fills it from the other language. It sends
  the field's `maxLength` as `max` (the translation never runs past it) and,
  on a description, its kind as `fit` (a description the AI wrote keeps its
  length in the other language). With
  `write` (`{kind: 'category', name}` on the
  category description, `{kind: 'restaurant'}` on the restaurant's, which
  the server writes from the saved menu) "Write with AI", or "Improve with
  AI" once the open tab has text, writes in the open language. The text
  lands in the form only; saving is the form's. The calls are
  `useTranslateText` / `useWriteDescription`
  (`shared/hooks/use-writing-help.ts`, error toasts only; a spent day's
  allowance, 429 `writing_help_limit`, shows the server's words rather than
  a seconds countdown). Every AI button shows the uses left today
  (`restaurant.writing_help.{limit, left}`, e.g. "28/30", none for no daily
  cap); each answer's `left` is written back into the session
  (`useWritingHelpLeft`, from `features/auth`), and at 0 the buttons turn
  red (Button `variant="spent"`), cannot be pressed and say to come back
  tomorrow, once per screen (the first spent field holds the note); the
  uses come back at the restaurant's midnight. E2E:
  `e2e/specs/dashboard/writing-help.spec.ts` runs on the real backend's
  pretend Gemini, switched on per test by an `x-e2e-writing-help` header
  added to API requests only (a font host refuses it); the count is real
  there, and `writing_help_used` starts an owner with uses spent. On the Package page a
  limit of 0 reads like a feature left out, in the table too.
- **Menu link** (`features/restaurant/components/identity/link-section.tsx`):
  the slug, changed on its own (not with the page's save), after a
  `ConfirmDialog` saying the old link and printed QR codes keep forwarding;
  `useChangeSlug` (`PUT /api/restaurant/slug`) refreshes the session and the
  QR page. The server writes the link cleanly ("My Place" → my-place).
- **Opening hours** (`features/restaurant/components/hours/`): each day is
  its name and switch, then its shifts, each an Opens and a Closes line:
  "Add a shift" up to `MAX_SHIFTS` (3; a new one starts where the last
  closes, for two hours, `nextShift()`), a remove button on every shift after
  the first. Shifts must not overlap and only the last may run past midnight
  (`shiftProblem()`, the server's `OpeningHours::problemWith()`), said under
  the shift at fault. The API sends a list per day, null when closed. A time is picked the
  way a clock reads (`TimePicker`): the hour (1 to 12), the minutes (00, 15,
  30, 45; a saved 07:20 keeps its 20) and AM | PM, with its part of the day
  beside it (Morning 05:00, Afternoon 12:00, Evening 17:00, Night 21:00),
  and stored as "HH:MM" as before (`splitTime` / `joinTime` in
  `time-options.ts`). A day whose last shift closes before it opens says it
  runs past midnight. The shared `Combobox` has a `size="sm"` for small pickers on
  one line, opens on the current choice, and grows to fit its options (up to
  320px) toward the side with room.
- Card text on the QR form is `''` in the form and `null` on the wire;
  `toFormValues` / `toDesign` convert, so blank text never saves as `""`.
- **On a phone it is an app** (below `lg`): no sidebar and no drawer, but
  four tabs at the bottom (`BottomTabs`, from `phoneTabs()` in nav-items:
  Home, Menu, the orders, More; a restaurant without orders gets Analytics,
  else the QR code, in third place; the tab wears the orders waiting; one
  gold card slides to the open tab, moved at once while the page follows as
  a transition). Home and More have no bar but a heading of their own
  (`hero` on `Topbar`) over the textured backdrop (`home-backdrop` in
  globals.css). More (`more` page, `more-page.tsx`) is every other section
  as a glass card with a hint line (`more.hints` in `common.json`) and its
  picture (`src/assets/images/more/<nav key>.webp`, shown once the file
  exists), in the sidebar's order, locked and left out exactly as the
  sidebar does, then Account across the width. A section opened
  from More shows a back button in the topbar. E2E reaches sections through
  `openSidebar()` (support/helpers), which opens More on a phone.
- **Overview** (`features/overview`, Home): the topbar greets the owner by
  name (`greeting` on `Topbar`, by the part of their day; no bar on Home),
  then "Your menu is live" with the phone picture
  (`public/assets/images/dashboard/overview-banner.webp`) rising out of the
  card, a big Share (the phone's share menu, else a copy), Preview and QR
  code; the orders waiting; today's numbers (`TodayNumbers`, with analytics
  on: views, QR scans, orders, each against yesterday up to now from the
  summary's `previous`, asked again every minute); only the next set-up step (`NextStep`, an icon
  per item; every step and How it works behind "See every step", nothing
  once all are done); then Quick (`ContentCounts`: dishes and categories
  against the package, then the links, counted alone; each a tap from its
  page). Home's tints are `--live`
  (green) and `--tint-violet` in tokens.css. The steps
  (`components/checklist/setup-stepper.tsx`: your restaurant, your dishes,
  sharing it) are built from `menuChecklist()` and `setupSteps()`, pure and
  unit tested; "How it works" is hidden on the owner's request and
  remembered in `ui.store`. Each item's action is a nav key.
- **Analytics** (`features/analytics`): opens on Today (ranges Today, 7
  and 30 days for every package, 90 days and All time with advanced; Today's
  chart is by the hour). The page needs `plan.analytics` (the
  nav locks it otherwise, with `AnalyticsTeaser`: this week's views from
  `GET /api/analytics/teaser`); `GET /api/analytics/advanced` only when
  `restaurant.plan.advanced_analytics` is on (the hook is disabled otherwise,
  never fired and caught). Charts are recharts with `responsive`; colours are
  theme tokens (`components/charts/chart-style.ts`), date helpers are
  `shared/utils/format/date.ts`, and every count goes through `formatNumber`
  (`format/number.ts`: the reader's language, Western digits). jsdom has no ResizeObserver, so the test
  setup stubs it and chart tests read the words around a chart, not its bars.

## Speed

- Every page but Orders is `lazy()` in `App.tsx` (`PAGES`, from each
  feature's `pages/index.ts`), so the first download is the shell; the rest
  load on idle (`usePrefetchPages`) and a page still on its way shows
  `PageSkeleton`. Pusher's library loads only in menu mode (`realtime()`
  imports it). Keep heavy libraries (recharts, qr-code-styling, dnd-kit)
  inside their feature, never in `shared` or the shell, or they come back
  into the first download.
- `package.json` says the source has no side effects (`sideEffects`: only
  the CSS and `main.tsx`), so importing one hook from a barrel brings that
  hook, not everything the barrel re-exports. A module that must run for
  its side effects alone goes on that list.
- The build splits the libraries that change least into their own files
  (react, query, forms, i18n: `vite.config.ts`, `codeSplitting`), so a
  release does not download them again, and each extra language is a file
  of its own.
- **The size budget** (`npm run check:bundle`, last step of `npm run check`,
  `scripts/check-bundle.mjs`): the JavaScript the first page needs, gzipped,
  stays under its budget (220 KB measured in October 2026, budget 235), no
  file over 300 KB but the charts, and the build's `.htaccess` keeps its
  security headers. Raise a number only on purpose.
- A library only a lazy page uses goes in `optimizeDeps.include`
  (`vite.config.ts`): otherwise the dev server bundles it at that page's
  first visit and reloads the page mid-load, which times out e2e tests.
- A tab from before a release asks for files that are gone:
  `app/new-release.ts` reloads it once (`vite:preloadError`).
- `public/.htaccess` ships with the build: `index.html` is `no-cache`,
  hashed files are kept a year, and a missing `assets/` file is a 404 (not
  the page). Fonts load without blocking the first paint. It also sets the
  security headers (HSTS, no framing, nosniff, referrer, permissions) and a
  `Content-Security-Policy-Report-Only` reporting to the API
  (`/api/csp-report`); once a week of reports is clean it is renamed
  `Content-Security-Policy`. A new outside host (a script, an API, an image
  domain) is added to it in the same change. Nothing may need `eval`: zod
  runs jitless (`src/config/zod.ts`, in zod's own chunk so it runs before
  any schema is made); its `new Function` probe was the only report.

## Commands

`npm run dev` · `npm run build` · `npm run check:bundle` · `npm run lint` ·
`npm run typecheck` · `npm run test` · `npm run test:coverage` ·
`npm run format` · `npm run format:check` · `npm run e2e` ·
`npm run e2e:update-snapshots`

CI (`.github/workflows/ci.yml`) runs `npm run check`, `npm audit`, checks
the committed `dist/` is this build (once the production `VITE_*` values
are repository variables), and runs the end-to-end suite on the built
dashboard (`E2E_BUILD=1`: `vite build --mode e2e` into
`.test-output/e2e-dist` and `vite preview`, never touching `dist/`),
except the screenshot projects, which stay on the owner's machine. Weekly
too.

A change is done when `typecheck`, `lint`, `format:check`, `test:coverage`,
`build` and `e2e` are all green; the full runs happen only when the user asks
for them (rule 6). E2E rules: each test builds its own owner
through the `owner()` fixture and never changes shared data; no retries, no
fixed sleeps; tag the main flow of an area `@matrix` so it also runs on a
phone, in Arabic RTL and in dark mode. Specs go in `e2e/specs/<surface>/`
(`dashboard`, `public`, `admin`, `quality`); a helper two specs use goes in
`e2e/support/helpers.ts`. Generated output only ever lands in
`.test-output/`.
