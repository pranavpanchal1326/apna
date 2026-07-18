// src/lib/weather/__tests__/rainAlert.test.ts
import { getRainAlertForItem } from '../rainAlert'
import type { WeatherDay } from '../../types/weather.types'

const day = (over: Partial<WeatherDay> = {}): WeatherDay =>
  ({ condition: 'clear', rainProbability: 0, ...over }) as unknown as WeatherDay

describe('getRainAlertForItem', () => {
  it('returns null when there is no weather data', () => {
    expect(getRainAlertForItem('activity', undefined)).toBeNull()
  })

  it('raises a strong alert for severe weather on an outdoor stop', () => {
    const alert = getRainAlertForItem('activity', day({ condition: 'thunderstorm' }))
    expect(alert?.level).toBe('strong')
  })

  it('raises a soft alert on high rain probability for an outdoor stop', () => {
    const alert = getRainAlertForItem('attraction', day({ condition: 'clouds', rainProbability: 70 }))
    expect(alert?.level).toBe('soft')
  })

  it('does not alert an indoor category even in a storm', () => {
    expect(getRainAlertForItem('food' as any, day({ condition: 'thunderstorm' }))).toBeNull()
  })

  it('does not alert when rain probability is below threshold', () => {
    expect(getRainAlertForItem('activity', day({ condition: 'clouds', rainProbability: 40 }))).toBeNull()
  })

  it('prefers the strong alert when both severe and high-probability apply', () => {
    const alert = getRainAlertForItem('activity', day({ condition: 'rain', rainProbability: 90 }))
    expect(alert?.level).toBe('strong')
  })
})
