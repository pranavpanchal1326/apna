// src/lib/engine/__tests__/splitEngine.test.ts
import {
  calculateSplit,
  validateSplit,
  splitSummaryLabel,
  SplitParticipant,
} from '../splitEngine'

const p = (uid: string, value?: number): SplitParticipant => ({ uid, value })
const sumPaise = (rs: { amountPaise: number }[]) => rs.reduce((s, r) => s + r.amountPaise, 0)

describe('calculateSplit — equal', () => {
  it('splits evenly and keeps the total exact in paise', () => {
    const res = calculateSplit({
      totalRupees: 100,
      paidByUid: 'a',
      participants: [p('a'), p('b'), p('c')],
      method: 'equal',
    })
    expect(sumPaise(res)).toBe(10000)
  })

  it('gives the rounding remainder to the payer', () => {
    const res = calculateSplit({
      totalRupees: 100.01, // 10001 paise / 3 -> 3333,3333,3335
      paidByUid: 'a',
      participants: [p('a'), p('b'), p('c')],
      method: 'equal',
    })
    expect(sumPaise(res)).toBe(10001)
    const payer = res.find(r => r.uid === 'a')!
    expect(payer.amountPaise).toBe(3335)
    expect(res.filter(r => r.uid !== 'a').every(r => r.amountPaise === 3333)).toBe(true)
  })

  it('moves the payer to the front even when listed last', () => {
    const res = calculateSplit({
      totalRupees: 100.01,
      paidByUid: 'a',
      participants: [p('b'), p('c'), p('a')], // payer last
      method: 'equal',
    })
    expect(res[0].uid).toBe('a')
    expect(res[0].amountPaise).toBe(3335) // still absorbs the remainder
    expect(sumPaise(res)).toBe(10001)
  })

  it('exposes a rupee value derived from paise', () => {
    const res = calculateSplit({
      totalRupees: 100, paidByUid: 'a', participants: [p('a'), p('b')], method: 'equal',
    })
    expect(res[0].amountRupees).toBe(50)
  })
})

describe('calculateSplit — exact', () => {
  it('accepts exact amounts that sum to the total', () => {
    const res = calculateSplit({
      totalRupees: 100, paidByUid: 'a',
      participants: [p('a', 70), p('b', 30)], method: 'exact',
    })
    expect(sumPaise(res)).toBe(10000)
  })

  it('throws when exact amounts do not sum to the total', () => {
    expect(() => calculateSplit({
      totalRupees: 100, paidByUid: 'a',
      participants: [p('a', 70), p('b', 20)], method: 'exact',
    })).toThrow(/Exact split sums/)
  })
})

describe('calculateSplit — percentage', () => {
  it('converts percentages into paise summing to the total', () => {
    const res = calculateSplit({
      totalRupees: 100, paidByUid: 'a',
      participants: [p('a', 33.33), p('b', 33.33), p('c', 33.34)], method: 'percentage',
    })
    expect(sumPaise(res)).toBe(10000)
    // payer absorbs the remainder
    expect(res.find(r => r.uid === 'a')!.amountPaise).toBeGreaterThanOrEqual(3333)
  })

  it('throws when percentages do not sum to 100', () => {
    expect(() => calculateSplit({
      totalRupees: 100, paidByUid: 'a',
      participants: [p('a', 50), p('b', 40)], method: 'percentage',
    })).toThrow(/must equal exactly 100/)
  })
})

describe('calculateSplit — guards', () => {
  it('throws with no participants', () => {
    expect(() => calculateSplit({ totalRupees: 100, paidByUid: 'a', participants: [], method: 'equal' }))
      .toThrow(/participant/)
  })

  it('throws on a non-positive total', () => {
    expect(() => calculateSplit({ totalRupees: 0, paidByUid: 'a', participants: [p('a')], method: 'equal' }))
      .toThrow(/greater than zero/)
  })

  it('throws on an unknown method', () => {
    expect(() => calculateSplit({
      totalRupees: 100, paidByUid: 'a', participants: [p('a')], method: 'bogus' as any,
    })).toThrow(/Unknown split method/)
  })
})

describe('validateSplit', () => {
  it('flags no participants and non-positive totals', () => {
    expect(validateSplit({ totalRupees: 100, participants: [], method: 'equal' }).isValid).toBe(false)
    expect(validateSplit({ totalRupees: 0, participants: [p('a')], method: 'equal' }).isValid).toBe(false)
  })

  it('is always valid for equal with participants', () => {
    expect(validateSplit({ totalRupees: 100, participants: [p('a')], method: 'equal' }).isValid).toBe(true)
  })

  it('validates exact sums with an unassigned/over message', () => {
    expect(validateSplit({ totalRupees: 100, participants: [p('a', 60), p('b', 40)], method: 'exact' }).isValid).toBe(true)
    const under = validateSplit({ totalRupees: 100, participants: [p('a', 60)], method: 'exact' })
    expect(under.isValid).toBe(false)
    expect(under.error).toMatch(/unassigned/)
    const over = validateSplit({ totalRupees: 100, participants: [p('a', 150)], method: 'exact' })
    expect(over.error).toMatch(/over by/)
  })

  it('validates percentage sums', () => {
    expect(validateSplit({ totalRupees: 100, participants: [p('a', 50), p('b', 50)], method: 'percentage' }).isValid).toBe(true)
    const bad = validateSplit({ totalRupees: 100, participants: [p('a', 50)], method: 'percentage' })
    expect(bad.isValid).toBe(false)
    expect(bad.sum).toBe(50)
  })
})

describe('splitSummaryLabel', () => {
  it('summarises each method', () => {
    expect(splitSummaryLabel(100, [p('a'), p('b')], 'equal')).toBe('₹50.00 each')
    expect(splitSummaryLabel(100, [p('a')], 'percentage')).toBe('by percentage')
    expect(splitSummaryLabel(100, [p('a')], 'exact')).toBe('custom amounts')
    expect(splitSummaryLabel(100, [], 'equal')).toBe('—')
    expect(splitSummaryLabel(100, [p('a')], 'bogus' as any)).toBe('—')
  })
})
