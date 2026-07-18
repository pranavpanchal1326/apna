// src/lib/utils/__tests__/currency.test.ts
import { formatINR } from '../currency'

describe('formatINR', () => {
  it('prefixes the rupee sign and uses Indian digit grouping', () => {
    expect(formatINR(100000)).toBe('₹1,00,000')
    expect(formatINR(1000)).toBe('₹1,000')
  })

  it('keeps up to two decimals but trims trailing zeros', () => {
    expect(formatINR(99.5)).toBe('₹99.5')
    expect(formatINR(100)).toBe('₹100')
  })

  it('handles zero', () => {
    expect(formatINR(0)).toBe('₹0')
  })
})
