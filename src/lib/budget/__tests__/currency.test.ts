// src/lib/budget/__tests__/currency.test.ts
import { SUPPORTED_CURRENCIES, convertToBaseCurrency, formatCurrency } from '../currency'

describe('SUPPORTED_CURRENCIES', () => {
  it('includes INR as a base currency', () => {
    expect(SUPPORTED_CURRENCIES).toContain('INR')
  })
})

describe('convertToBaseCurrency', () => {
  it('returns the amount unchanged for INR regardless of rate', () => {
    expect(convertToBaseCurrency(500, 'INR', 83)).toBe(500)
  })

  it('multiplies by the rate for foreign currencies', () => {
    expect(convertToBaseCurrency(10, 'USD', 83)).toBe(830)
  })
})

describe('formatCurrency', () => {
  it('formats INR with the rupee sign and Indian grouping', () => {
    expect(formatCurrency(100000, 'INR')).toBe('₹1,00,000')
  })

  it('uses known symbols for supported foreign currencies', () => {
    expect(formatCurrency(100, 'USD')).toBe('$100')
    expect(formatCurrency(100, 'EUR')).toBe('€100')
  })

  it('falls back to the currency code as the symbol when unknown', () => {
    expect(formatCurrency(100, 'JPY')).toBe('JPY100')
  })
})
