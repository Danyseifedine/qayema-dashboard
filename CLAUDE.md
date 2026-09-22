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
qr-code-styling, @paddle/paddle-js, date-fns, DOMPurify.
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
- Every mutation shows a toast on success and error. Every query has a
  skeleton and an `ErrorState` with retry.
- Backend contract: `../qayema/routes/api.php` and
  `../qayema/app/Http/Resources/*`. Errors are `{message, code}`; can't-afford
  is **402** carrying `balance`, `needed`, `shortfall`.

## Commands

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` ·
`npm run test` · `npm run test:e2e` · `npm run format`
