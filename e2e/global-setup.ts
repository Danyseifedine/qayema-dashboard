import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * A fresh e2e database and media before every run. `e2e:reset` refuses to
 * run anywhere but APP_ENV=e2e against database/e2e.sqlite, so this can never
 * reach the owner's MySQL.
 *
 * E2E_SKIP_RESET=1 keeps the current data, for running one spec while
 * another run is still using the same servers. Tests never depend on it:
 * each builds its own owner.
 */
export default function globalSetup(): void {
  if (process.env.E2E_SKIP_RESET === '1') return

  const backend = resolve(dirname(fileURLToPath(import.meta.url)), '../../qayema')
  try {
    execFileSync('composer', ['e2e:reset', '--no-ansi'], { cwd: backend, stdio: 'pipe' })
  } catch (error) {
    const output = error as { stdout?: Buffer; stderr?: Buffer }
    throw new Error(`e2e:reset failed:\n${output.stdout ?? ''}${output.stderr ?? ''}`, {
      cause: error,
    })
  }
}
