# Qayema Dashboard — Working Rules

## Non-negotiable rules

1. **Never commit.** Never run `git commit`, `git push`, `git add`, `git stash`,
   `git reset`, or any command that changes git state. The user does every
   commit. If a step would normally end with a commit, stop and say the tree is
   ready to commit.
2. **Never leave a component unused.** Every component, hook, store, schema or
   util you create must be imported and used in the same task. If a task ends
   and something is unused, delete it or wire it in — never leave it.
3. **Always use the component.** Before writing markup, look in
   `src/shared/components/` and the feature's `components/`. If a component
   exists for the job, use it. Never re-implement a button, dialog, field,
   table, empty state or skeleton with raw JSX. If the existing component does
   not fit, extend it — do not fork it.
4. **Always tell the truth.** Report what actually happened: if a build failed,
   a test was skipped, a step was not done, or you are guessing — say it
   plainly in the first sentence. No softening, no reassurance, no claiming
   something works without having run it. The user does not need feelings
   managed; they need accurate status.

## Stack

React 19, Vite, TypeScript (strict), TanStack Router (file-based) + Query +
Table, Zustand + immer, React Hook Form + Zod v4, Tailwind v4 + shadcn/ui,
i18next (en/ar, RTL), axios, dnd-kit, react-dropzone, recharts,
qr-code-styling, date-fns, DOMPurify.
Tests: Vitest + Testing Library + MSW; Playwright for e2e. Lint: oxlint.
Format: Prettier. Hooks: Husky + lint-staged.

No third-party error telemetry. Errors go through `src/lib/logger`.

## Architecture (full detail in docs/ARCHITECTURE.md)

- Feature-first: `src/features/<name>/{api,schemas,types,hooks,store,components/<area>,pages}`
  plus an `index.ts` barrel.
- Import direction: `routes → features → shared → lib → config`. Cross-feature
  imports only through the other feature's `index.ts`.
- State ownership: server data → TanStack Query; UI state → Zustand;
  form state → RHF + Zod; URL state → router search params. Never mix.
- Every API call parses its response with a Zod schema. Every form has a Zod
  schema. `config/env.ts` validates `import.meta.env` at boot.
- Session is the Sanctum cookie. No tokens in localStorage/sessionStorage.
  CSRF primed from `GET /api/csrf-token` (body token → `X-CSRF-TOKEN`).
- Every user-visible string goes through i18n (`en` and `ar`). Use logical
  Tailwind utilities (`ms-`, `pe-`, `text-start`) so RTL needs no overrides.
- **Folders are final.** Add files; do not add folders. If a folder seems
  missing, ask before creating it.

## Conventions

- Files: `kebab-case.ts`, components `PascalCase.tsx`, hooks `use-*.ts`,
  `*.schema.ts`, `*.api.ts`, `*.store.ts`, `*.test.ts(x)` co-located.
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
  unlimited — never render it as a number. Nothing is bought in the SPA:
  `POST /api/packages/request` sends a message and an admin assigns the
  package.
- Section gating is data-driven: `requiresFeature` on a nav item is matched
  against `restaurant.features` by key. Adding a gated section is one line in
  `nav-items.ts`, not another branch in `isNavItemLocked`.
- An order is written once by the guest who placed it. The dashboard may change
  its `status` and nothing else.
- The QR preview mirrors the printable card: `qr-studio/components/preview/qr-options.ts`
  is the twin of `QrStyle::options()` in `../qayema`, tested against the same
  cases. Change one, change both. `qr-code-styling` needs a real canvas, so
  tests mock it and assert the options it was given, not the pixels.
- Card text on the QR form is `''` in the form and `null` on the wire;
  `toFormValues` / `toDesign` convert, so blank text never saves as `""`.
- Overview analytics: `GET /api/stats` for every package, `GET /api/stats/advanced`
  only when `restaurant.features.advanced_analytics` is on (the hook is
  disabled otherwise, never fired and caught). Charts are recharts with
  `responsive`; colours are theme tokens (`chart-style.ts`). jsdom has no
  ResizeObserver, so the test setup stubs it and chart tests read the words
  around a chart, not its bars.

## Commands

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` ·
`npm run test` · `npm run test:e2e` · `npm run format`
