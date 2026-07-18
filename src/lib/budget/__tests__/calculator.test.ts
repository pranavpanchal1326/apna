// src/lib/budget/__tests__/calculator.test.ts
import {
  calculateEqualSplit,
  calculateCustomSplit,
  validateSplits,
  calculatePercentageSplit,
} from '../calculator'

const sum = (splits: Record<string, number>) =>
  Object.values(splits).reduce((a, b) => a + b, 0)

describe('calculateEqualSplit', () => {
  it('splits evenly among members', () => {
    expect(calculateEqualSplit(300, ['a', 'b', 'c'])).toEqual({ a: 100, b: 100, c: 100 })
  })

  it('assigns the rounding remainder to the last member so the total is exact', () => {
    const splits = calculateEqualSplit(100, ['a', 'b', 'c'])
    expect(sum(splits)).toBeCloseTo(100, 2)
    // first members floored to 33.33, last absorbs the remainder
    expect(splits.a).toBeCloseTo(33.33, 2)
    expect(splits.c).toBeCloseTo(33.34, 2)
  })

  it('returns an empty object with no members', () => {
    expect(calculateEqualSplit(100, [])).toEqual({})
  })
})

describe('calculateCustomSplit', () => {
  it('passes custom splits through unchanged', () => {
    const splits = { a: 70, b: 30 }
    expect(calculateCustomSplit(100, splits)).toEqual(splits)
  })
})

describe('validateSplits', () => {
  it('accepts splits that sum to the total', () => {
    expect(validateSplits({ a: 60, b: 40 }, 100)).toBe(true)
  })

  it('rejects splits that do not sum to the total', () => {
    expect(validateSplits({ a: 60, b: 30 }, 100)).toBe(false)
  })

  it('rejects any negative share', () => {
    expect(validateSplits({ a: 120, b: -20 }, 100)).toBe(false)
  })

  it('rejects an empty split map', () => {
    expect(validateSplits({}, 100)).toBe(false)
  })
})

describe('calculatePercentageSplit', () => {
  it('converts percentages into amounts that sum to the total', () => {
    const splits = calculatePercentageSplit(1000, { a: 25, b: 75 })
    expect(sum(splits)).toBeCloseTo(1000, 2)
    expect(splits.a).toBeCloseTo(250, 2)
  })

  it('throws when percentages do not sum to 100', () => {
    expect(() => calculatePercentageSplit(1000, { a: 25, b: 25 })).toThrow('Percentages must sum to 100')
  })
})
