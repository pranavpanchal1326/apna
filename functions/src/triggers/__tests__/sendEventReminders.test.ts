// Unit tests for the pure IST time helpers behind hangout/task reminders.

import {
  IST_OFFSET_MS,
  nowIST,
  istDateString,
  istWallTimeToEpoch,
  isInTwoHourWindow,
} from '../sendEventReminders'

describe('istWallTimeToEpoch', () => {
  it('converts IST wall time to UTC epoch', () => {
    // 2026-07-16 14:00 IST = 2026-07-16 08:30 UTC
    const epoch = istWallTimeToEpoch('2026-07-16', '14:00')
    expect(epoch).toBe(Date.parse('2026-07-16T08:30:00.000Z'))
  })

  it('returns null for missing or malformed time', () => {
    expect(istWallTimeToEpoch('2026-07-16', undefined)).toBeNull()
    expect(istWallTimeToEpoch('2026-07-16', '2pm')).toBeNull()
    expect(istWallTimeToEpoch('2026-07-16', '')).toBeNull()
  })

  it('returns null for an invalid date', () => {
    expect(istWallTimeToEpoch('not-a-date', '14:00')).toBeNull()
  })
})

describe('isInTwoHourWindow', () => {
  const now = Date.parse('2026-07-16T08:00:00.000Z')
  const h = 60 * 60 * 1000

  it('fires for events 2h to <3h ahead', () => {
    expect(isInTwoHourWindow(now + 2 * h, now)).toBe(true)
    expect(isInTwoHourWindow(now + 2.5 * h, now)).toBe(true)
    expect(isInTwoHourWindow(now + 3 * h - 1, now)).toBe(true)
  })

  it('does not fire outside the window (no double-sends across hourly sweeps)', () => {
    expect(isInTwoHourWindow(now + 3 * h, now)).toBe(false) // caught by the next sweep instead
    expect(isInTwoHourWindow(now + 2 * h - 1, now)).toBe(false)
    expect(isInTwoHourWindow(now + 1 * h, now)).toBe(false)
    expect(isInTwoHourWindow(now - 1 * h, now)).toBe(false)
  })
})

describe('nowIST / istDateString', () => {
  it('shifts by the IST offset and formats the date', () => {
    // 2026-07-16 23:00 UTC → 2026-07-17 04:30 IST
    const utc = Date.parse('2026-07-16T23:00:00.000Z')
    const ist = nowIST(utc)
    expect(ist.getTime() - utc).toBe(IST_OFFSET_MS)
    expect(istDateString(ist)).toBe('2026-07-17')
  })
})
