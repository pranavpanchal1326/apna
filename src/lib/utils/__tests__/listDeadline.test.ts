// src/lib/utils/__tests__/listDeadline.test.ts
import {
  getDeadlineUrgency,
  formatDeadlineLabel,
  urgencyColorKey,
  urgencyRank,
  todayISODate,
} from '../listDeadline'

// Fixed reference "now": 2026-01-10 09:00 local.
const NOW = new Date('2026-01-10T09:00:00').getTime()

describe('getDeadlineUrgency', () => {
  it('is "none" when there is no deadline', () => {
    expect(getDeadlineUrgency(undefined, NOW)).toBe('none')
  })

  it('is "overdue" for a past date', () => {
    expect(getDeadlineUrgency('2026-01-09', NOW)).toBe('overdue')
  })

  it('is "due_soon" within 48 hours', () => {
    expect(getDeadlineUrgency('2026-01-11', NOW)).toBe('due_soon')
  })

  it('is "upcoming" within a week but beyond 48 hours', () => {
    expect(getDeadlineUrgency('2026-01-15', NOW)).toBe('upcoming')
  })

  it('is "none" for a far-future date', () => {
    expect(getDeadlineUrgency('2026-03-01', NOW)).toBe('none')
  })
})

describe('formatDeadlineLabel', () => {
  it('handles missing, overdue, today, tomorrow, and near-week dates', () => {
    expect(formatDeadlineLabel(undefined, NOW)).toBe('')
    expect(formatDeadlineLabel('2026-01-09', NOW)).toBe('Overdue')
    expect(formatDeadlineLabel('2026-01-10', NOW)).toBe('Today')
    expect(formatDeadlineLabel('2026-01-11', NOW)).toBe('Tomorrow')
    expect(formatDeadlineLabel('2026-01-14', NOW)).toBe('4 days')
  })

  it('shows a formatted date beyond a week', () => {
    const label = formatDeadlineLabel('2026-02-01', NOW)
    expect(label).toMatch(/Feb/)
  })
})

describe('urgencyColorKey', () => {
  it('maps each urgency to a token key', () => {
    expect(urgencyColorKey('overdue')).toBe('accentDanger')
    expect(urgencyColorKey('due_soon')).toBe('warning')
    expect(urgencyColorKey('upcoming')).toBe('accentPrimary')
    expect(urgencyColorKey('none')).toBe('textMuted')
  })
})

describe('urgencyRank', () => {
  it('orders overdue before due_soon before upcoming before none', () => {
    expect(urgencyRank('overdue')).toBeLessThan(urgencyRank('due_soon'))
    expect(urgencyRank('due_soon')).toBeLessThan(urgencyRank('upcoming'))
    expect(urgencyRank('upcoming')).toBeLessThan(urgencyRank('none'))
  })
})

describe('todayISODate', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
