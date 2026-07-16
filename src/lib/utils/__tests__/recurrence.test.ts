// src/lib/utils/__tests__/recurrence.test.ts
// Client mirror of functions/src/engine/recurrence.ts — must stay in sync.

import { computeNextRunDate, initialRunDate, describeRecurrence } from '../recurrence'

describe('computeNextRunDate (client mirror)', () => {
  it('weekly advances 7 days across boundaries', () => {
    expect(computeNextRunDate('2026-07-16', 'weekly')).toBe('2026-07-23')
    expect(computeNextRunDate('2026-12-29', 'weekly')).toBe('2027-01-05')
  })

  it('monthly clamps to short months and restores anchor', () => {
    expect(computeNextRunDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28')
    expect(computeNextRunDate('2026-02-28', 'monthly', 31)).toBe('2026-03-31')
    expect(computeNextRunDate('2028-01-31', 'monthly', 31)).toBe('2028-02-29')
    expect(computeNextRunDate('2026-12-15', 'monthly', 15)).toBe('2027-01-15')
  })
})

describe('initialRunDate', () => {
  it('weekly starts today', () => {
    expect(initialRunDate('weekly', undefined, new Date(2026, 6, 16))).toBe('2026-07-16')
  })

  it('monthly starts this month if anchor not yet passed', () => {
    expect(initialRunDate('monthly', 20, new Date(2026, 6, 16))).toBe('2026-07-20')
  })

  it('monthly rolls to next month if anchor already passed', () => {
    expect(initialRunDate('monthly', 5, new Date(2026, 6, 16))).toBe('2026-08-05')
  })
})

describe('describeRecurrence', () => {
  it('formats ordinals correctly', () => {
    expect(describeRecurrence('weekly')).toBe('Repeats weekly')
    expect(describeRecurrence('monthly', 1)).toBe('Repeats monthly on the 1st')
    expect(describeRecurrence('monthly', 2)).toBe('Repeats monthly on the 2nd')
    expect(describeRecurrence('monthly', 3)).toBe('Repeats monthly on the 3rd')
    expect(describeRecurrence('monthly', 11)).toBe('Repeats monthly on the 11th')
    expect(describeRecurrence('monthly', 12)).toBe('Repeats monthly on the 12th')
    expect(describeRecurrence('monthly', 13)).toBe('Repeats monthly on the 13th')
    expect(describeRecurrence('monthly', 21)).toBe('Repeats monthly on the 21st')
    expect(describeRecurrence('monthly', 31)).toBe('Repeats monthly on the 31st')
  })
})
