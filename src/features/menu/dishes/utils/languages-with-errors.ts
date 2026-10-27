/** Every language with something wrong somewhere in these errors. */
export function languagesWithErrors(errors: unknown, languages: readonly string[]): string[] {
  const found = new Set<string>()
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      if (key === 'ref') continue
      if (languages.includes(key) && value && typeof value === 'object' && 'message' in value) {
        found.add(key)
      } else {
        walk(value)
      }
    }
  }
  walk(errors)
  return languages.filter((code) => found.has(code))
}
