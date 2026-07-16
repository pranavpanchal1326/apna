// Unit tests for buffer-time warning math (PRD §13 — pure parts only;
// the Mapbox Directions call itself degrades to null and is not tested here).

import {
  timeToMinutes,
  departureMinutes,
  gapMinutes,
  shouldWarn,
  type TimedStop,
} from '../lib/itinerary/travelTime'

const stop = (partial: Partial<TimedStop>): TimedStop => ({ id: 'x', ...partial })

describe('timeToMinutes', () => {
  it('parses HH:MM', () => {
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('0:05')).toBe(5)
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  it('rejects missing/malformed/out-of-range times', () => {
    expect(timeToMinutes(undefined)).toBeNull()
    expect(timeToMinutes('9am')).toBeNull()
    expect(timeToMinutes('24:00')).toBeNull()
    expect(timeToMinutes('12:60')).toBeNull()
  })
})

describe('departureMinutes', () => {
  it('prefers endTime', () => {
    expect(departureMinutes(stop({ startTime: '10:00', endTime: '11:30' }))).toBe(690)
  })

  it('falls back to start + duration', () => {
    expect(departureMinutes(stop({ startTime: '10:00', durationMinutes: 45 }))).toBe(645)
  })

  it('falls back to startTime alone, else null', () => {
    expect(departureMinutes(stop({ startTime: '10:00' }))).toBe(600)
    expect(departureMinutes(stop({}))).toBeNull()
  })
})

describe('gapMinutes', () => {
  it('computes free minutes between stops', () => {
    const from = stop({ startTime: '10:00', endTime: '11:00' })
    const to = stop({ startTime: '11:20' })
    expect(gapMinutes(from, to)).toBe(20)
  })

  it('returns null for misordered or untimed stops', () => {
    expect(gapMinutes(stop({ startTime: '12:00' }), stop({ startTime: '11:00' }))).toBeNull()
    expect(gapMinutes(stop({}), stop({ startTime: '11:00' }))).toBeNull()
    expect(gapMinutes(stop({ startTime: '10:00' }), stop({}))).toBeNull()
  })
})

describe('shouldWarn', () => {
  it('warns when the drive clearly exceeds the gap (PRD example: 20 vs 35)', () => {
    expect(shouldWarn(20, 35)).toBe(true)
  })

  it('gives 5 minutes of grace to avoid nagging', () => {
    expect(shouldWarn(30, 32)).toBe(false)
    expect(shouldWarn(30, 35)).toBe(false)
    expect(shouldWarn(30, 36)).toBe(true)
  })

  it('never warns when the drive fits', () => {
    expect(shouldWarn(60, 30)).toBe(false)
  })
})
