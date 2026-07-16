// functions/src/engine/__tests__/recurrence.test.ts

import {
  computeNextRunDate,
  isDue,
  isExpired,
  occurrenceExpenseId,
  type RecurringTemplate,
} from '../recurrence'

describe('computeNextRunDate — weekly', () => {
  it('advances exactly 7 days', () => {
    expect(computeNextRunDate('2026-07-16', 'weekly')).toBe('2026-07-23')
  })

  it('crosses month boundaries', () => {
    expect(computeNextRunDate('2026-07-28', 'weekly')).toBe('2026-08-04')
  })

  it('crosses year boundaries', () => {
    expect(computeNextRunDate('2026-12-29', 'weekly')).toBe('2027-01-05')
  })
})

describe('computeNextRunDate — monthly', () => {
  it('advances one month on the same day', () => {
    expect(computeNextRunDate('2026-07-05', 'monthly', 5)).toBe('2026-08-05')
  })

  it('clamps rent-on-the-31st to short months', () => {
    expect(computeNextRunDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28')
  })

  it('handles leap February', () => {
    expect(computeNextRunDate('2028-01-31', 'monthly', 31)).toBe('2028-02-29')
  })

  it('returns to the anchor day after a clamped month', () => {
    expect(computeNextRunDate('2026-02-28', 'monthly', 31)).toBe('2026-03-31')
  })

  it('crosses year boundaries', () => {
    expect(computeNextRunDate('2026-12-15', 'monthly', 15)).toBe('2027-01-15')
  })

  it('defaults anchor to current day when dayOfMonth omitted', () => {
    expect(computeNextRunDate('2026-07-10', 'monthly')).toBe('2026-08-10')
  })
})

describe('isDue', () => {
  const base: RecurringTemplate = {
    frequency: 'monthly',
    dayOfMonth: 1,
    nextRunDate: '2026-07-01',
    active: true,
  }

  it('is due on and after nextRunDate', () => {
    expect(isDue(base, '2026-07-01')).toBe(true)
    expect(isDue(base, '2026-07-03')).toBe(true) // catches up after scheduler downtime
  })

  it('is not due before nextRunDate', () => {
    expect(isDue(base, '2026-06-30')).toBe(false)
  })

  it('paused templates never fire', () => {
    expect(isDue({ ...base, active: false }, '2026-07-01')).toBe(false)
  })

  it('templates past endDate never fire', () => {
    expect(isDue({ ...base, endDate: '2026-06-30' }, '2026-07-01')).toBe(false)
  })

  it('endDate is inclusive', () => {
    expect(isDue({ ...base, endDate: '2026-07-01' }, '2026-07-01')).toBe(true)
  })
})

describe('isExpired', () => {
  it('expires once nextRunDate passes endDate', () => {
    expect(isExpired({ nextRunDate: '2026-08-01', endDate: '2026-07-31' })).toBe(true)
    expect(isExpired({ nextRunDate: '2026-07-31', endDate: '2026-07-31' })).toBe(false)
    expect(isExpired({ nextRunDate: '2099-01-01' })).toBe(false)
  })
})

describe('occurrenceExpenseId', () => {
  it('is deterministic per template+date (idempotency key)', () => {
    expect(occurrenceExpenseId('t1', '2026-07-01')).toBe('rec_t1_2026-07-01')
    expect(occurrenceExpenseId('t1', '2026-07-01')).toBe(occurrenceExpenseId('t1', '2026-07-01'))
  })
})
