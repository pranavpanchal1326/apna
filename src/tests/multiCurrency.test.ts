import { convertToBaseCurrency, formatCurrency, SUPPORTED_CURRENCIES } from '@/lib/budget/currency'

describe('Multi-Currency', () => {
  test('INR → INR conversion is 1:1', () => {
    expect(convertToBaseCurrency(1000, 'INR', 1)).toBe(1000)
  })

  test('USD → INR at stored rate', () => {
    expect(convertToBaseCurrency(100, 'USD', 83.5)).toBe(8350)
  })

  test('exchange rate stored at entry time, not recalculated', () => {
    // Storing rate 83.5, later rate changes to 84.2 — must use 83.5
    const stored = convertToBaseCurrency(100, 'USD', 83.5)
    const liveRate = convertToBaseCurrency(100, 'USD', 84.2)
    expect(stored).not.toBe(liveRate)
    expect(stored).toBe(8350)  // uses stored rate
  })

  test('supported currencies include USD, EUR, AED, THB', () => {
    expect(SUPPORTED_CURRENCIES).toContain('USD')
    expect(SUPPORTED_CURRENCIES).toContain('EUR')
    expect(SUPPORTED_CURRENCIES).toContain('AED')
    expect(SUPPORTED_CURRENCIES).toContain('THB')
  })

  test('formatCurrency INR shows ₹', () => {
    expect(formatCurrency(1375, 'INR')).toContain('₹')
  })

  test('formatCurrency USD shows $', () => {
    expect(formatCurrency(100, 'USD')).toContain('$')
  })
})
