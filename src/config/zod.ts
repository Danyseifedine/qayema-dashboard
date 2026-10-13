import { z } from 'zod'

/**
 * Zod's "jit" builds a faster parser with `new Function`, which the
 * dashboard's Content-Security-Policy refuses (no `unsafe-eval`): the first
 * schema it meets tries it, and every page load sent a CSP report. Jitless,
 * it never tries. It has to run before any schema is made (each `z.object()`
 * decides when it is created): the build puts it in zod's own chunk
 * (vite.config.ts), and main.tsx imports it first.
 */
z.config({ jitless: true })
