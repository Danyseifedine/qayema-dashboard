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
  (categories, dishes), `offers`, `build-your-own`, `design`, `orders` (+ its `table-orders` page),
  `tables`, `qr`, `social-links`,
  `restaurant` (+ its `features` page), `package`, `account`. The sidebar
  goes by how often a page is opened: Overview and Analytics, then ORDERS
  (Orders, Table orders), MENU (Categories, Dishes, Offers, Build your own), LOOK (Design,
  Appearance), SHARING (QR code, Tables, Social links), SETTINGS
  (Restaurant, Features, Package); Account opens from the avatar menu.
  The vocabulary table is §2 of docs/ARCHITECTURE.md; the backend's CLAUDE.md
  carries the same names.
- Four words never swapped: **plan** = what the restaurant may use
  (`restaurant.plan`, one boolean per backend `Feature` flag:
  `multiple_languages`, `variants`, `addons`, `appearance`, `premium_designs`,
  `qr_studio`, `ordering`, `menu_ordering`, `dine_in`, `analytics`, `advanced_analytics`, `offers`,
  `build_your_own` (on no package); `requiresPlan`
  in nav-items); **switched off** = what the owner turned off on the Features
  page (`restaurant.switched_off`, `hideable` in nav-items); **grant** is a
  backend word (an admin giving one restaurant more than its package);
  **turned off** = a flag an admin forced off for one restaurant
  (`restaurant.turned_off`, also false in `plan`; `useTurnedOff(flag)`).
- Feature-first: `src/features/<name>/{api,schemas,hooks,components/<area>,pages}`
  plus an `index.ts` barrel that exports only what outsiders import, never a
  page: pages are exported by `pages/index.ts`, which only `App.tsx` imports
  (`__tests__/App.pages.test.ts`).
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
  (`common`, `overview`, `analytics`, `menu`, `offers`, `build-your-own`, `design`, `appearance`, `orders`, `tables`,
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
  `*.test.ts(x)` in a `__tests__` folder inside the folder of what they test
  (`topbar/__tests__/topbar.test.tsx`), so a folder lists its code and one
  folder of tests. Identifiers use `color`; English copy "colour".
- Named exports only. `@/` alias for all imports.
- Query keys come from the feature's key factory; never hand-written arrays.
- Toasts live in the mutation hook, not the call site, so every caller gets
  them. A mutation that writes and waits toasts on success and on error. An
  **optimistic** mutation (reorder, availability) toasts on **error only**: the
  UI already moved, so a success toast is noise, while an error toast explains
  why it snapped back.
- Every query has a skeleton and an `ErrorState` with retry.
- **A refused request is not a bad connection.** The host's bot protection
  (Imunify360) answers a request it refuses without CORS headers, which the
  browser shows as no answer at all. `lib/api/unanswered.ts` tells the two
  apart: on a request with no answer it asks for `favicon.ico` on the API's
  site (`no-cors`, kept by Cloudflare): an answer means the site is
  reachable and the request was refused (`blocked`), none that the phone is
  offline. A refusal the page can read (its text names Imunify360) is
  `code: 'blocked'` (`toApiError`). The session gate then says it is the
  hosting, with "Open qayema.com" (a full page lets the host's check run)
  and Try again, instead of "check your internet". What happened is
  reported (`source: 'network'`) once a request gets through, so Grafana
  shows how often owners are refused.
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
  "See packages", or "Ask us to turn it on" for a flag no package has,
  `useOnNoPackage`). One waiting for a **design** is disabled. Anything locked inside a page uses `LockedState`
  (`shared/components/feedback`) and names its package with
  `usePackageFor(flag, locale)` from the package barrel, never a hard-coded
  "Pro". A flag the admin **turned off** is never an upsell: where
  `useTurnedOff(flag)` is true, `PlanLockedPage`, the QR studio, advanced
  analytics and the Design page show `TurnedOffNotice` (package barrel:
  "Turned off for your restaurant", "Contact us" opens the package request
  with a note naming the feature, no "See packages"), and `LockedFeature`
  (Features page), the analytics range tooltip and the Package page's list
  say "turned off" instead of naming a package.
- **Package page** (`features/package`): the current package with its dates
  from the session (`package.{ends_at, days_left}`, `lapsed`,
  `upcoming`), shown as "Until …, N days left", a warning with "Ask to
  extend" in the last 7 days; the topbar pill is a crown with no text in the
  package's metal (`package.tier`, the admin's choice; from a server
  before it bronze Free, silver Pro, gold Premium and Custom, `tierOf()`)
  with the days left in a round badge on its corner, edged in
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
  has; the current one at the restaurant's own price when an admin set one,
  `meta.your_price_cents`, else the published one) and the comparison table. Cards and table both read
  `utils/package-rows.ts`, the one list of features, groups and order. Tests
  use `PACKAGE_CATALOGUE` / `makePackage()` (`test/factories/packages`)
  and `FULL_PLAN` / `EMPTY_PLAN` (`…/session`).
- **Features page** (`features/restaurant/pages/features-page.tsx`, its parts
  in `components/features/`): related
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
  guest's variants, add-ons and builds, as named then: "Your pizza: ½
  Margherita + ½ Pepperoni") show under the dish on its card; "Changed by
  you at …" shows after an edit. A dish added in the editor is built there
  too (`BuildPicker`, priced by `buildPriceCents` from the build-your-own
  barrel, the one twin of `BuildPrice`; a pizza priced by size asks its
  size first, `choicesAt()` in `order-edit.ts`, the twin of
  `BuildChoices::forSize()`). The editor loads the first time an order is edited
  (`lazy` in `OrderBoard`), since the Orders page is in the first download.
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
  background tab too (each such check also refreshes the order lists, which
  never poll on their own; a pushed change refreshes them too):
  a new order plays `public/new_order_alert.mp3`, toasts and refreshes the
  list; the number waiting is the sidebar badge (`counts`) and the tab title
  "(2) …". Analytics label the orders tile and the funnel's last step from
  `order_channel` ("Sent to WhatsApp" vs "Orders").
- **Two currencies**: the Restaurant page's Money and time section adds an
  optional second currency and its rate (`second_currency`,
  `exchange_rate`: main per one second, written either way round by the
  owner, `utils/exchange-rate.ts`; 1 USD = 89,000 LBP by default for that
  pair; an untouched rate goes back as the server's own string). A dish is
  priced in the main one or the second (`dish.currency`, a toggle beside
  its price), its choices with it. Orders show each line in its own
  currency and the total in the order's, with the rate when lines differ;
  a total worked out here is the server's rule: each second-currency line
  `round(cents x rate)`, then added up (`orderTotal()` in
  `features/orders/utils/order-edit.ts`; `rateFor()`, `formatRate()` in
  `shared/utils/format/money.ts`). An amount-off offer
  is in the main currency (`discountedCents(…, rate)`). Saving the
  restaurant refreshes dishes and offers (`offerKeys` from
  `features/offers`'s barrel).
- **Offers** (`features/offers`, `/api/offers`, needs `plan.offers`, in
  MENU after Dishes): cards in the owner's order (drag, the menu feature's
  `SortableList` from its barrel), each with its status ("Live now",
  "Starts Fri 6:00 PM", from the server), where it shows, its discount,
  its schedule as a sentence (`utils/offer-schedule.ts`) and its last 30
  days' numbers, a switch to pause it (optimistic) and edit and delete;
  an offer without a picture shows a gold tile with its discount ("20%",
  "2nd free") or its sign (`NoPicture` in `offer-card.tsx`).
  The editor (`components/editor/offer-editor.tsx`) is a page of its own
  that takes the list's place (back arrow, a confirm before dropping
  changes), in five steps (`offer-steps.ts`, the shared `Stepper`; Next checks
  only the open step's fields, a saved offer can jump to and save from any
  step, a refused save opens the first step with an error): 1 the picture,
  then "Write a title and text on it" (`show_text`; off makes a picture
  alone, which needs its picture: `saved_image` counts the one it has);
  2 where it shows (`PlacementPicker`: banner, pop-up or ad, never
  pop-up and ad together) and its shape (`banner_shape` rectangle 2:1 or
  square, `popup_shape` square or tall 3:4, picked on cards drawn with the
  owner's picture by `OfferPreview`; an ad is always a rectangle; the
  live preview is `LivePreview` over
  `PreviewFigure`), how often and how long for a
  pop-up or an ad; 3 what the offer gives guests (`gives`, a `Segmented`
  first): nothing to order (a tap does nothing or opens a link), a
  discount on the owner's dishes (the discount, its dishes, then what a
  tap does; the step is "What guests get"; dishes: `DishPicker`, grouped by
  `dishGroups()`: "Dishes guests build" first in a panel of their own with
  the build icon and a line on their price, then each category in the
  menu's order, each with "Select all"; old and new price by
  `discountedCents`, the twin of the server's; never a deal dish, which the
  server refuses). A percent or
  an amount covers the size and other choices picked, add-ons not: each
  dish is read at `dishPrices()` (`utils/discount.ts`: `reference`, its own
  price or 0 plus the cheapest option of each variant with 2 or more, the
  amount check's price; a dish priced by its sizes lists each size, "Small
  $8.00 becomes $6.40"), only while variants are on. "2nd item"
  (`discount_type: 'second'`, `discount_value` 1 to 100, `FREE` = 100,
  starting free; a `Segmented` Free / Percent off and then the percent):
  any two dishes on the offer pair up and the second one the guest adds is
  that much off (`secondCents()`, "$12.50, 2nd $6.25"); said "2nd one 50%
  off" / "2nd one free" by `discountLine()`. Or **a deal**
  (the tab "A deal": a dish of its own, `DealFields`: "Deal name", the
  offer's title until the owner writes one, "What it includes", its price
  with a currency
  toggle, its category, the only one picked for it, an `Alert` to
  Categories without one, and "Use the offer's picture" or a new photo of
  its own; off with no new photo keeps the one it has, the offer never
  removes it). A deal sends `deal` with `discount_type: 'none'`,
  `dish_ids: []` and `action: 'dishes'` (a tap opens it); leaving a saved
  deal asks first (`ConfirmDialog`) and saving sends `deal: null`. It is a
  dish against the package: at the limit (the session's counts,
  `isAtLimit`) the choice is closed unless the offer has one. The dish is
  on the menu, and orderable, only while the offer is live; 4 when (`ScheduleSection`: always, or dates with `DateField`,
  a repeat, and times with `TimeField`, said back as one sentence in the
  restaurant's timezone; with some days or hours (`hasHours()`), "Show it
  all the time" sends `shows_outside_hours`: shown always, the deal only
  in its hours, the sentence ending "shown all the time" and the status
  "Shown, deal from Wed 5:00 PM"); 5 a review of every choice with previews in each
  place it shows and the switch that puts it on the menu. Dates travel as the restaurant's local "YYYY-MM-DDTHH:MM";
  an end date without a time is the next midnight (`toLocal`). An order
  line bought on an offer says "Grill week, was $25.00" on its card. A
  deal shows on the card and the review as "Deal: Family meal, $25.00"
  with its photo (`DealSummary`). On the Dishes page a deal dish
  (`dish.offer`) wears an "Offer deal" chip and a line from its offer's
  status ("On your menu while “Pizza night” runs", "Hidden now. Back Fri
  6:00 PM with …", paused, ended; `localDate` from the offers barrel); its
  dish window says which offer made it, with "Open the offer"
  (`useUiStore().editOffer`, which the Offers page opens in its editor
  once), and deleting it says the offer stays, without a deal. Saving or
  deleting a deal dish refreshes the offers; an offer save with a deal, a
  pause or a delete of an offer with one refreshes the dishes and the
  session's counts.
  Backend rules: `../qayema/docs/architecture/offers.md`.
- **Times and dates in forms:** `TimeField` (shared forms, hour, quarter
  minutes and AM | PM, stored "HH:MM", the opening hours' and the offers'
  times) and `DateField` (our own calendar, `DatePicker` in shared/ui:
  the day in words in the dashboard's language, a month Monday first with
  today marked, `min`/`max`, Today and Clear, arrows/Page Up/Home/End,
  mirrored in Arabic; "YYYY-MM-DD", '' when cleared; never `type="date"`);
  a panel dropping from a field sits fixed at it through `useAnchoredPlace`
  (shared/hooks, the Combobox's too); a colour is `ColorField`, a hex box
  beside `ColorPicker` (shared/ui: our own shade box and hue strip, dragged
  or moved with the arrows, never `type="color"`, HSV helpers in
  `shared/utils/color/hsv.ts`);
  the clock helpers (`splitTime`, `joinTime`, `runsPastMidnight`,
  `shiftProblem`) are `shared/utils/format/clock.ts`.
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
- **Build your own** (`features/build-your-own`, nav key and namespace
  `build-your-own`, in MENU after Offers, `requiresPlan: 'build_your_own'`:
  on no package, an admin turns it on per restaurant; opened by a link
  without it, `PlanLockedPage` offers "Ask us to turn it on" since no
  package has it): a dish guests build from parts, a pizza half and half
  (`split`: each part its own price for that size, else its share) or three
  scoops (`pieces`, each whole). **A build is its dish**: nothing is picked
  from the menu. The page is a card per build in the owner's dish order (the
  dish's photo and name as its heading, the heading above the parts under
  it, "Halves and thirds, from Pizzas", "From $12": the dish's price plus
  `cheapestCents`, the twin of `BuildPrice::cheapest()` beside
  `buildPriceCents` in `utils/build-price.ts`; a warning chip below 2
  choices guests can pick) with edit, delete and "New build" in a
  `LimitHeader` (the dishes guests build against the restaurant's
  `limits.builds`, 3 unless an admin sets another; disabled at it, at the
  package's dish limit; never for want of a category, which its dish
  lacks, though "From a category" says when there is none). The editor
  (`components/editor/build-editor.tsx`, `build-steps.ts`, the shared
  `Stepper`) takes the list's place like the offers': 1 what guests build
  (three cards: a pizza half and half, scoops or pieces, something else;
  `kindDefaults()` sets the rest up, the dish's name and icon included),
  2 the choices (a category's offered dishes, `offeredDishes()`,
  each a `CheckRow` ticked to start; unticked ones are left out, `dish_ids`,
  null while every one is ticked so a dish added later joins,
  `tickedDishes()`; or an own list of 2 to 30 on the menu's `ChoiceRow`), 3 the parts (the step says "Parts", never "Sizes", which a pizza's own Small / Large are; Whole
  to Quarters or 1 to 4 pieces, More for the rest; how it is made asked for
  "Something else" only, a pizza and scoops keep what their card set; own
  part prices behind "Set your own prices", empty boxes showing "6.00
  auto"), 4 On your menu (`MenuStep`: "Name on the menu", also the title
  above the parts (`titleOf()`), and an icon from the categories' set
  (`IconPickerField` from the menu barrel); no category, price,
  description or photo: the dish sits above the menu's search; the labels
  never say "dish", since the owner makes a build, not a dish), 5 a review
  drawn like the menu's dish sheet (`BuildPreview`, with the icon). A new
  build is `POST /api/dishes` with its name, icon, `category_id: null`,
  `price: null` and `builds`; a saved one is `PATCH /api/dishes/{id}` with
  the same (an older dish's description emptied and photo deleted), the
  dish's other builds sent back
  as saved (`savedBuildsPayload()`, part prices of sold-out dishes kept).
  Deleting a dish's only build deletes the dish (`useDeleteDish` from the
  menu barrel, "It leaves your menu."); one of several is a PATCH of
  `builds` without it. `placeBuildErrors()` puts a 422 on the editor's
  fields (the dish's own on step 4) and the rest above the form; saving
  translates the dish's name and the own-list names. The Dishes page
  leaves a build's dish out while the feature is on. The dish form never holds or sends `builds` (the response keeps
  them): a dish with saved builds, while they are on, needs no price of its
  own, its variants are extras, and an `Alert` says "Guests build this
  dish" with the way to the page (`useUiStore().showBuildsOf`, which the page
  scrolls to). Orders price their builds through the feature's barrel.
- **Table orders** (`table-orders` page inside `features/orders`,
  `GET /api/orders?kind=table`): orders to a table, a table at a time, the
  one waiting longest first, with the same cards and actions as Orders
  (`useOrderActions`, `CancelOrderDialog`). The Orders page asks
  `kind=away`. A card shows its one next step as a button; edit, cancel
  and delete wait behind its ⋮ (`ActionMenu` in shared/ui). A table order
  leads with the table and a drawn tent card with its number
  (`TableTent`). The filter is round pills, and "still waiting" an
  `Alert` banner whose tap shows only the new ones. Before the first table order
  the page shows `PictureEmptyState` (`no-orders.webp`, straight on the
  page, its black edges faded out) with the way to the Tables page. While orders go to WhatsApp
  either page says so with `WhatsAppNotice`, the same `GoldNotice` as QR
  Studio switched off, and still lists those placed here before. The pulse
  runs while orders or table orders are taken in the menu, and returns
  `{orders, tables}`: one sidebar count each, both in the tab title.
- **Tables** (`features/tables`, `/api/tables`, needs `plan.dine_in`):
  each table has a name and a random `code`; its QR code opens the menu at
  `?table=<code>&qr=1`, and an order "at my table" (`dine_in`) goes to it.
  Codes are drawn with the QR page's design (`useQr`, `qrOptions` from the
  qr barrel) by `QrCode`, the one component that draws a code (the QR
  page's preview too); tables never import `qr-code-styling` themselves. Add a numbered run or one by name, rename (the code stays),
  give a new code (the printed card stops working), remove (orders keep the
  table's name). Print uses a portal sheet (`components/print/print-sheet.tsx`)
  that `globals.css` shows only on paper. `meta.takes_orders` is false while
  ordering at the table is switched off, with a way to Features.
- **The QR page** (`QrStudio` in `components/studio/qr-studio.tsx`) is a
  column of glass cards (`SectionCard` with `heading="caps"`): the live code
  standing on a marble table (`qr-ground.webp`) with PNG and SVG, the menu link, the scans, then
  Customisation (four tiles: Colours, Shapes with three quick looks, Logo
  with its switch, the card's colour; `customise-tiles.tsx`) and Text &
  content, with Save pinned above the phone's tabs (`.sticky-actions` in
  globals.css, shared with Restaurant, sitting on the bar's measured
  `--tabbar-height`). An open dialog stops the page behind it scrolling
  (`:root:has(dialog:modal)`). A tile's chevron opens
  every choice of its kind in a `ControlSheet` (a native `<dialog>`, a
  bottom sheet on a phone) with a small live preview. Its fields mount only
  while it is open, so tests open the sheet first.
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
  one-language menu, and `tidy` rewrites the text as the owner leaves the
  control (a dish's ingredients: `tidyIngredients`, the twin of the
  backend's `App\Support\Ingredients`). Send every active language (blank clears it); never send
  a hidden one (the server keeps it for when the owner switches back).
- **Writing help (AI)**: while `restaurant.writing_help` is on (the server
  has an AI provider set up and the package gives credits a month, its only
  AI limit: there are no uses a day), `WritingHelpProvider` (around
  the pages in `App.tsx`) lets every `TranslatableTextField` show
  `WritingHelpButtons`: Translate, a gold icon beside its language tabs
  (the full name as `aria-label`), and on a description "Write with AI", a
  small gold pill in the box's bottom end corner: "Translate", either way: "to
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
  (`shared/hooks/use-writing-help.ts`, error toasts only; spent credits,
  429 `writing_help_credits`, show the server's words rather than a seconds
  countdown). Every AI button's tooltip says what it does and the month's
  credits left (`writing_help.credits.{limit, left, resets_on, prices}`,
  "6,840 of 7,500 AI credits left this month", none without a cap; never
  money; null from a server from before them); each answer's
  `credits_left` is written back into the session (`useWritingHelpLeft`,
  from `features/auth`, through `withLeft`). A button whose action the
  credits do not cover (`spentFor()`: fewer left than a translation or a
  description costs; a 429 `writing_help_credits` says the credits left)
  turns red (Button `variant="spent"`), cannot be pressed and says the day
  the credits come back, once per screen (`WritingHelpSpentNote`: the first
  spent field holds the note); the Package page lists each package's
  credits a month and, while capped, the credits used this month beside
  the other limits; a month whose `resets_on` has come is
  taken as back in a tab left open; a dish's save and its "Translate all
  names" wait for each other (`useTranslatingMany`), since the server runs
  one AI request a restaurant at a time;
  saving a dish or a category first fills in (`useTranslateOnSave`, over
  `useTranslateMany`: one translation's credits) every text written in one language only
  (`missingTranslation`, `shared/utils/string/missing-translations.ts`; a
  dish's list in `features/menu/dishes/utils/dish-translations.ts`), and
  saves as written should that fail or the credits be spent; while it will,
  `OneLanguageNote` atop the form says one language is enough, and it is: the
  form's rules (`makeDishFormSchema` / `makeCategoryFormSchema` with
  `anyLanguage`, `requireMainLanguage(..., anyLanguage)`) then take a name in
  either language, the AI filling the main one in; the variants and add-ons also have
  one "Translate all names" button (`TranslateChoicesButton`). A
  translatable field shows its count of characters only past 80% of its
  limit; the credits come back on the 1st in the restaurant's timezone. E2E:
  `e2e/specs/dashboard/writing-help.spec.ts` runs on the real backend's
  pretend Gemini, switched on per test by an `x-e2e-writing-help` header
  added to API requests only (a font host refuses it); the count is real
  there, and `writing_help_days` starts an owner with credits spent. On the Package page a
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
  way a clock reads (`TimeField`, shared/components/forms/fields): the hour (1 to 12), the minutes (00, 15,
  30, 45; a saved 07:20 keeps its 20) and AM | PM, with its part of the day
  beside it (Morning 05:00, Afternoon 12:00, Evening 17:00, Night 21:00),
  and stored as "HH:MM" as before (`splitTime` / `joinTime` in
  `shared/utils/format/clock.ts`). A day whose last shift closes before it opens says it
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
  a transition).
- **Every page opens on the same heading**, Home's layout: no bar, but a
  small label, the page's name in large type with the crown and the avatar
  on its line, and what the page is for (`Topbar`, text from
  `usePageHero`: Home greets the owner, other pages give their name and
  their namespace's description), over the textured backdrop
  (`home-backdrop` in globals.css). On a phone, a section opened from More
  adds its back button on a row of its own above. Pages draw no title of
  their own (a page's usage is `LimitNotice`, "6 / 40 on your package",
  beside its add button; `setBy="restaurant"` for a limit an admin sets
  per restaurant, Build your own's: "1 / 3 set for your restaurant"); a new page adds its line to `usePageHero`.
- **Shared pieces worth knowing (use them, never hand-roll their look):**
  - Banners: `Alert` is the one banner: `warning` (amber, wants the owner to
    act: orders waiting, turned off, a limit), `error` (red), `info` (small
    and quiet, a helpful word); `size="sm"` inside a card; `action` for its
    one button; `onClick` makes it a link with an arrow. No blue banners.
  - Dialogs: a form dialog is `FormDialog` (header, save error, `notice`,
    fields, Cancel from common `dialog.cancel` and the save button); other
    dialogs are `Modal` + `ModalBody` / `ModalHeader` / `ModalFooter`; asking
    before a loss is `ConfirmDialog`.
  - Status: `StatusChip` (tones gold, success, warning, danger, info,
    neutral, faded) for every state label; `ProgressBar` (gold) for any
    progress; `StepCircle` for numbered steps.
  - Buttons: `Button` variants include `accent` (the AI's gold buttons) and
    sizes `icon-sm` (32px, menus and AI icons) and `icon-xs` (inside a field
    or banner). Dropdown panels share `menuPanelClass` / `menuItemClass`; a
    choice drawn as a card uses `optionCardClass(checked)`.
  - Cards and rows: `SectionCard` (icon optional, `action` slot) and
    `FormSection` (a SectionCard of fields) are every settings card; an
    on/off row is `SwitchRow` (`SwitchField` in a form); a capped list's
    header is `LimitHeader` (count + Add button, `loading`); a link out is
    `ExternalLink`; prices are always `Money` (`prefix` for "+"); a
    translatable name with a fallback is `nameOr`.
  - Text fields show their count of characters only near the limit
    (`CharacterCount` in `Field`). Every menu text's limit (dish name 60,
    ingredients 300, category 40 and 120, restaurant 60 and 200, a
    choice's name 40, an offer's 60 and 200) is `MENU_TEXT_LIMITS`
    (`shared/constants/menu-text-limits.ts`), the twin of ../qayema's
    `MenuTextLimits`: change one, change both. Radii are the tokens only: `rounded-card`
    (cards, dialogs), `rounded-tile` (a box in a card), `rounded-field`,
    `rounded-control`; status colours are the utilities (`text-status-warn`,
    `bg-accent-wash`), never `[var(--…)]`. A tile over a photo is the
    `frost-tile` utility.
  - A category's icon: `CATEGORY_ICONS` / `categoryIcon()` in
    `features/menu/categories/constants/category-icons.ts` (the same 30 Tabler
    icons as ../qayema's `CategoryIcons`, add one in both), picked in the
    category dialog (`CategoryIconField`), shown on the category card and its
    filter chip (`FilterChip.icon`).
  - Every dialog is `Modal` underneath (the native `<dialog>`, its open
    state, Escape and the backdrop handled once); a loading block is `Skeleton`; a row of
    filter chips is `FilterChips`; a popover closes through `useDismiss`;
    a list still loading is `SkeletonList`; a row card's edit and delete are `RowActions`; whether a package's allowance is used up is `isAtLimit` (`shared/utils/limits`, for the Add button in `LimitHeader`); a number's change against before is `ChangeLine` (analytics tiles, Home's today); keyboard focus is the `focus-ring` utility (globals.css); a panel inside a card (a number, a group of settings) is the `inset-tile` utility, never a bordered box, and a titled group of fields is `FormSection`, on the same glass card as `SectionCard`; copying a link is
    `copyWithToast`; a part of a whole reads through `formatShare`. Orders and
    Table orders are one `OrderBoard` with their own wording, empty state and
    sorting; it lists 30 at a time, unfinished orders first and newest first within
    each (the API's order, so one still waiting is never behind "Show more"; `useOrders` is an infinite
    query, pages joined and deduplicated), with "Show more" for the next.
- **Dark only:** the dashboard has one set of colours (`:root` in
  `tokens.css`, `color-scheme: dark`), like the website; there is no theme
  switch and nothing keyed on a theme. In the collapsed sidebar a row's
  name shows beside it on hover or focus (`sidebar/rail-tooltip.tsx`).
- **Corners and fields:** every card, dialog and sheet is `rounded-card`
  (12px), a box inside one `rounded-tile` (8px), and fields and buttons
  `--radius-field` / `--radius-control` (8px), all tokens in `tokens.css`;
  nothing picks its own radius. Every field is one height, about 41px
  (`controlClass`: 10px padding, 14px text). More (`more` page, `more-page.tsx`) is every other section
  as a glass card with a hint line (`more.hints` in `common.json`) and its
  picture (`public/assets/images/dashboard/more`, mapped by nav key in
  `ART`; a half-width card shows it whole as a band on top, with no icon
  but a lock when locked; Package and Account keep theirs on dark gold
  glass, `.gold-chip` in globals.css), under More's own headings (`GROUPS`
  in more-page.tsx: Menu (Categories, Dishes, Offers, Build your own), Look, Sharing (QR code,
  Social links), Orders (Delivery and pickup, Table orders, Tables),
  Insights (Analytics), Settings): every section but Home, the tabs' own
  included, locked and left out exactly as the sidebar does, a heading with
  nothing left going too, then Account across the width. The two kinds of
  order have names that say which is which: the `orders` page is "Delivery
  and pickup" (a bag), `table-orders` is "Table orders" (fork and knife); the
  phone's tab for them is "Orders" (a receipt), and while both are taken
  their pages switch between each other at the top (`OrdersSwitch`, on the
  shared `PageSwitch`, like `MenuSwitch` for Dishes and Categories). A section opened
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
  against the package, then the links, counted alone, and while the AI is
  on and capped its credits left this month with a bar, "Back on Nov 1"
  once none are, opening the Package page; each a tap from its page). Home's tints are `--live`
  (green) and `--tint-violet` in tokens.css. The steps
  (`components/checklist/setup-stepper.tsx`: your restaurant, your dishes,
  sharing it) are built from `menuChecklist()` and `setupSteps()`, pure and
  unit tested; the dishes without a photo come from the session
  (`restaurant.dishes_without_photo`, refreshed by a dish save that adds or
  removes one), never from downloading the menu; "How it works" is hidden on the owner's request and
  remembered in `ui.store`. Each item's action is a nav key.
- **Analytics** (`features/analytics`): opens on Today (ranges Today, 7
  and 30 days for every package, 90 days and All time with advanced; Today's
  chart is by the hour). The page needs `plan.analytics` (the
  nav locks it otherwise, with `AnalyticsTeaser`: this week's views from
  `GET /api/analytics/teaser`); `GET /api/analytics/advanced` only when
  `restaurant.plan.advanced_analytics` is on (the hook is disabled otherwise,
  never fired and caught). Charts are recharts with `responsive`; colours are
  the colour tokens (`utils/chart-style.ts`), date helpers are
  `shared/utils/format/date.ts`, and every count goes through `formatNumber`
  (`format/number.ts`: the reader's language, Western digits). jsdom has no ResizeObserver, so the test
  setup stubs it and chart tests read the words around a chart, not its bars.

## Speed

- Every page but Orders is `lazy()` in `App.tsx` (`PAGES`, from each
  feature's `pages/index.ts`), so the first download is the shell; the rest
  load on idle once the page's own data is in (`usePrefetchPages`; not at
  all on a slow or data-saving connection) and a page still on its way shows
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
phone and in Arabic RTL. Specs go in `e2e/specs/<surface>/`
(`dashboard`, `public`, `admin`, `quality`); a helper two specs use goes in
`e2e/support/helpers.ts`. Generated output only ever lands in
`.test-output/`.
