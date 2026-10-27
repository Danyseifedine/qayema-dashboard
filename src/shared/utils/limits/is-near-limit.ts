/** Whether a text nears its limit: past 80% a field shows its count of characters. */
export function isNearLimit(length: number, max: number): boolean {
  return length >= max * 0.8
}
