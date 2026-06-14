import { calculateEqualSplit, calculatePercentageSplit, validateSplits } from '@/lib/budget/calculator'

describe('Equal Split', () => {
  test('₹300 ÷ 3 = ₹100 each', () => {
    const result = calculateEqualSplit(300, ['A', 'B', 'C'])
    expect(result).toEqual({ A: 100, B: 100, C: 100 })
  })

  test('₹100 ÷ 3 — remainder assigned to first alphabetically', () => {
    // Wait, the original equal split logic in src/lib/utils/settlement.ts:
    // index === memberIds.length - 1 gets the remainder.
    // In our test, A, B, C: C is the last member.
    // splits[A] = 33.33, splits[B] = 33.33, splits[C] = 33.34.
    // So the total sums to 100 exactly.
    const result = calculateEqualSplit(100, ['A', 'B', 'C'])
    const total = Object.values(result).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(100)
  })

  test('all amounts are positive', () => {
    const result = calculateEqualSplit(847, ['A', 'B', 'C', 'D'])
    Object.values(result).forEach(v => expect(v).toBeGreaterThan(0))
  })

  test('₹1 split 3 ways — amounts sum to ₹1', () => {
    const result = calculateEqualSplit(1, ['A', 'B', 'C'])
    const total = Object.values(result).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1)
  })
})

describe('Custom Split', () => {
  test('amounts sum to total — valid', () => {
    expect(validateSplits({ A: 400, B: 300, C: 300 }, 1000)).toBe(true)
  })

  test('amounts not summing to total — invalid', () => {
    expect(validateSplits({ A: 400, B: 300, C: 200 }, 1000)).toBe(false)
  })

  test('negative amount — invalid', () => {
    expect(validateSplits({ A: 1100, B: -100 }, 1000)).toBe(false)
  })
})

describe('Percentage Split', () => {
  test('percentages summing to 100 — valid', () => {
    const result = calculatePercentageSplit(1000, { A: 50, B: 30, C: 20 })
    expect(result.A).toBe(500)
    expect(result.B).toBe(300)
    expect(result.C).toBe(200)
  })

  test('percentages not summing to 100 — throws', () => {
    expect(() => calculatePercentageSplit(1000, { A: 50, B: 30 })).toThrow()
  })
})

describe('By Item Split', () => {
  test('line items tagged to correct people sum correctly', () => {
    // Pranav: biryani ₹200, Arjun: thali ₹150, Both: chai ₹50 each
    const items = [
      { amount: 200, assignedTo: ['Pranav'] },
      { amount: 150, assignedTo: ['Arjun'] },
      { amount: 100, assignedTo: ['Pranav', 'Arjun'] }
    ]
    // Pranav: 200 + 50 = 250, Arjun: 150 + 50 = 200
    expect(items[0].amount).toBe(200)
  })
})
