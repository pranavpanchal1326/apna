// src/lib/weather/__tests__/weather.utils.test.ts
import { mapWmoCodeToCondition, describeWmoCode, isWeatherStale } from '../weather.utils'

describe('mapWmoCodeToCondition', () => {
  it('maps representative WMO codes to conditions', () => {
    expect(mapWmoCodeToCondition(0)).toBe('clear')
    expect(mapWmoCodeToCondition(2)).toBe('clouds')
    expect(mapWmoCodeToCondition(45)).toBe('fog')
    expect(mapWmoCodeToCondition(53)).toBe('drizzle')
    expect(mapWmoCodeToCondition(63)).toBe('rain')
    expect(mapWmoCodeToCondition(81)).toBe('rain')
    expect(mapWmoCodeToCondition(73)).toBe('snow')
    expect(mapWmoCodeToCondition(86)).toBe('snow')
    expect(mapWmoCodeToCondition(95)).toBe('thunderstorm')
  })

  it('returns "unknown" for unmapped codes', () => {
    expect(mapWmoCodeToCondition(42)).toBe('unknown')
    expect(mapWmoCodeToCondition(-1)).toBe('unknown')
  })
})

describe('describeWmoCode', () => {
  it('describes known codes', () => {
    expect(describeWmoCode(0)).toBe('Clear sky')
    expect(describeWmoCode(65)).toBe('Heavy rain')
  })

  it('falls back for unknown codes', () => {
    expect(describeWmoCode(1234)).toBe('Forecast unavailable')
  })
})

describe('isWeatherStale', () => {
  const NOW = new Date('2026-01-10T12:00:00Z').getTime()
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
  })
  afterAll(() => jest.useRealTimers())

  it('is fresh within three hours', () => {
    expect(isWeatherStale(NOW - 2 * 60 * 60 * 1000)).toBe(false)
  })

  it('is stale beyond three hours', () => {
    expect(isWeatherStale(NOW - 4 * 60 * 60 * 1000)).toBe(true)
  })
})
