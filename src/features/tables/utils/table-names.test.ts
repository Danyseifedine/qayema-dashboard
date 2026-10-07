import { describe, expect, it } from 'vitest'
import { lastPrefix, nextNumber, numberedNames } from '@/features/tables/utils/table-names'

describe('table names', () => {
  it("numbers a run of tables after the owner's word", () => {
    expect(numberedNames('Table', 3, 5)).toEqual(['Table 3', 'Table 4', 'Table 5'])
    expect(numberedNames('  طاولة ', 1, 2)).toEqual(['طاولة 1', 'طاولة 2'])
    expect(numberedNames('', 7, 8)).toEqual(['7', '8'])
  })

  it('carries on from the highest number already used', () => {
    expect(nextNumber([])).toBe(1)
    expect(nextNumber(['Table 2', 'Bar', 'Table 12', 'Terrace 4'])).toBe(13)
  })

  it('reuses the words of the last numbered table', () => {
    expect(lastPrefix(['Table 1', 'Terrace 2', 'Bar'])).toBe('Terrace')
    expect(lastPrefix(['Bar'])).toBeNull()
    expect(lastPrefix(['12'])).toBe('')
  })
})
