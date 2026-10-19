/** An address as a person reads it: "qayema.com/olive", without "https://". */
export function withoutScheme(url: string): string {
  return url.replace(/^https?:\/\//, '')
}
