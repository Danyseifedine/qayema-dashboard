// The size budget of a build (`npm run check` runs it after `vite build`).
//
//   node scripts/check-bundle.mjs [dist]
//
// Fails when the JavaScript the first page needs (index.html's script and
// what it preloads, gzipped, as a phone on mobile data downloads it) grows
// past FIRST_PAINT_KB, or when one file grows past CHUNK_KB before gzip.
// The charts (recharts, only on the Analytics page) are the one file allowed
// to be bigger. Also fails when the build's .htaccess has lost the security
// headers (public/.htaccess). Raise a number only on purpose: a library that slipped into
// the shell (see CLAUDE.md, Speed) is what this is here to catch.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

/** Measured at 220 KB in October 2026, plus room for normal growth. */
const FIRST_PAINT_KB = 235
const CHUNK_KB = 300
const ALLOWED_BIG = [/^analytics-.*\.js$/]
const HEADERS = [
  'Strict-Transport-Security',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Content-Security-Policy',
]

const dist = process.argv[2] ?? 'dist'
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const firstPaint = [
  ...html.matchAll(/<script[^>]+src="\/([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\/([^"]+\.js)"/g),
].map((match) => match[1])

const kb = (bytes) => bytes / 1024
const gzipped = firstPaint.reduce(
  (total, file) => total + gzipSync(readFileSync(join(dist, file))).length,
  0,
)

const problems = []
if (kb(gzipped) > FIRST_PAINT_KB) {
  problems.push(
    `The first page needs ${kb(gzipped).toFixed(1)} KB of JavaScript (gzipped), over the ${FIRST_PAINT_KB} KB budget: ${firstPaint.join(', ')}`,
  )
}

const assets = join(dist, 'assets')
for (const file of readdirSync(assets)) {
  if (!file.endsWith('.js') || ALLOWED_BIG.some((pattern) => pattern.test(file))) continue
  const size = kb(statSync(join(assets, file)).size)
  if (size > CHUNK_KB) problems.push(`${file} is ${size.toFixed(1)} KB, over ${CHUNK_KB} KB`)
}

const htaccess = readFileSync(join(dist, '.htaccess'), 'utf8')
for (const header of HEADERS) {
  if (!htaccess.includes(`Header always set ${header}`)) {
    problems.push(`.htaccess no longer sets ${header}`)
  }
}

if (problems.length > 0) {
  console.error(problems.map((problem) => `✗ ${problem}`).join('\n'))
  process.exit(1)
}

console.log(
  `✓ First page: ${kb(gzipped).toFixed(1)} KB of JavaScript gzipped (budget ${FIRST_PAINT_KB} KB), ${firstPaint.length} files; no file over ${CHUNK_KB} KB; security headers in place.`,
)
